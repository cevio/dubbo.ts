import { TRegistry, Application, TRegistryBaseEvents, TConsumerChannel, TConsumer, TConsumerBaseEvents } from '@dubbo.ts/application';
import { Client, createClient, CreateMode, Stat, Event } from 'node-zookeeper-client';
import { localhost, Events } from '@dubbo.ts/utils';
import { Attachment } from '@dubbo.ts/protocol';
import { format, parse, UrlWithParsedQuery } from 'url';
import { getRegistryFinger } from './finger';
import { Balance } from './balance';

type TRegistryEvents = TRegistryBaseEvents & {
  ['node:create']: [string],
  ['node:remove']: [string],
}

export interface TZooKeeperOptions {
  host: string,
  sessionTimeout?: number,
  spinDelay?: number,
  retries?: number,
}

type TConsumerInvoker = {
  status: 0 | 1 | -1,
  pending: boolean,
  error: Error,
  balance: Balance,
  resolveAndReject: [(channel: TConsumerChannel) => void, (e: Error) => void][],
  path: string,
}

export class ZooKeeper extends Events<TRegistryEvents> implements TRegistry<TRegistryEvents> {
  private readonly zookeeper: Client;
  private readonly providerNodes: Set<string> = new Set();
  private readonly consumerFilters: Set<(uri: UrlWithParsedQuery, index: number, data: UrlWithParsedQuery[]) => boolean> = new Set();
  private readonly consumerInvokers: Map<string, TConsumerInvoker> = new Map();
  constructor(private readonly application: Application, options: TZooKeeperOptions = { host: localhost }) {
    super();
    this.application.on('mounted', () => this.connect());
    this.application.on('stop', () => this.close());
    this.application.on('provider:start', () => this.publishProviderNodes());
    this.application.on('provider:stop', () => this.unPublishProviderNodes());
    this.zookeeper = createClient(options.host, {
      sessionTimeout: options.sessionTimeout || 30000,
      spinDelay: options.spinDelay || 1000,
      retries: options.retries || 0,
    });
  }

  public addFilter(callback: (uri: UrlWithParsedQuery) => boolean) {
    this.consumerFilters.add(callback);
    return this;
  }

  public async invoke(name: string, options: { group?: string, version?: string } = {}) {
    if (!this.application.consumer) throw new Error('please create consumer first');
    const id = getRegistryFinger(name, options);
    if (!this.consumerInvokers.has(id)) {
      this.consumerInvokers.set(id, {
        status: 0,
        error: null,
        pending: false,
        balance: new Balance(id),
        resolveAndReject: [],
        path: this.createConsumerNode(name, options).node,
      });
    }
    const invoker = this.consumerInvokers.get(id);
    return await new Promise<TConsumerChannel>((resolve, reject) => {
      switch (invoker.status) {
        case -1: reject(invoker.error); break;
        case 1: resolve(invoker.balance.getOne()); break;
        default:
          invoker.resolveAndReject.push([resolve, reject]);
          if (!invoker.pending) {
            invoker.pending = true;
            const consumer = this.application.consumer as TConsumer<TConsumerBaseEvents>;
            this.getConsumer(name, options).then(uris => {
              invoker.balance.setManyChannels(uris, (host, port) => this.application.consumer.connect(host, port));
              invoker.status = 1;
              return this.create(invoker.path);
            }).then(() => {
              invoker.balance.on('disconnect', () => {
                this.remove(invoker.path);
                this.consumerInvokers.delete(id);
              });
              consumer.on('stop', () => this.remove(invoker.path));
              const pools = invoker.resolveAndReject.slice(0);
              invoker.resolveAndReject.length = 0;
              this.runAllResolves(pools, invoker.balance.getOne());
            }).catch(e => {
              invoker.status = -1;
              invoker.error = e;
              const pools = invoker.resolveAndReject.slice(0);
              invoker.resolveAndReject.length = 0;
              this.runAllRejects(pools, e);
            }).finally(() => invoker.pending = false)
          }
      }
    })
  }

  private runAllRejects(pools: TConsumerInvoker['resolveAndReject'], e: Error) {
    for (let i = 0; i < pools.length; i++) pools[i][1](e);
  }

  private runAllResolves(pools: TConsumerInvoker['resolveAndReject'], data: TConsumerChannel) {
    for (let i = 0; i < pools.length; i++) pools[i][0](data);
  }

  private async getConsumer(name: string, options: { group?: string, version?: string } = {}) {
    const group = options.group || '*';
    const version = options.version || '0.0.0';
    const path = `/${this.application.root}/${name}/providers`;
    const urls = (await this.query(path)) || [];
    let uris = urls.map(url => parse(decodeURIComponent(url), true));
    if (this.consumerFilters.size) {
      for (const filter of this.consumerFilters) {
        uris = uris.filter(filter);
      }
    } else {
      uris = uris.filter((URI) => {
        const interfaceMatched = URI.query[Attachment.INTERFACE_KEY] === name || URI.query[Attachment.PATH_KEY] === name;
        const groupMatched = group === '*' ? true : (URI.query[Attachment.GROUP_KEY] === group);
        const versionMatched = version === '0.0.0' ? true : URI.query[Attachment.VERSION_KEY] === version;
        return !!(interfaceMatched && groupMatched && versionMatched);
      })
    }
    return uris;
  }

  private createConsumerNode(name: string, options: { group?: string, version?: string } = {}) {
    const obj = {
      protocol: "consumer",
      slashes: true,
      host: `${localhost}/${name}`,
      query: {
        [Attachment.APPLICATION_KEY]: this.application.application,
        category: "consumers",
        [Attachment.DUBBO_VERSION_KEY]: this.application.version,
        [Attachment.INTERFACE_KEY]: name,
        [Attachment.PID_KEY]: this.application.pid,
        side: 'consumer',
        [Attachment.TIMESTAMP_KEY]: Date.now(),
        [Attachment.VERSION_KEY]: options.version || '0.0.0',
        [Attachment.GROUP_KEY]: options.group || '*',
      }
    }
    const dubboInterfaceURL = format(obj);
    const interface_root_path = `/${this.application.root}/${name}`;
    const interface_dir_path = interface_root_path + '/consumers';
    const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(dubboInterfaceURL);
    return {
      id: getRegistryFinger(name, options),
      node: interface_entry_path,
    };
  }

  // public setChannelMatcher(callback: TChannelMatchHandler) {
  //   this.channelMatchRule = callback;
  //   return this;
  // }

  /**
   * 当前Provider服务器信息
   */
  get providerHost() {
    return `${localhost}:${this.application.port}`;
  }

  /**
   * Provider 将服务信息拼接成Node压入堆栈中。
   * @param name interface名称
   * @param methods 方法列表
   * @param options 参数选择
   */
  public addProviderService(name: string, methods: string[], options: { group?: string, version?: string } = {}) {
    const obj = {
      protocol: "dubbo",
      slashes: true,
      host: `${this.providerHost}/${name}`,
      query: {
        [Attachment.ANYHOST_KEY]: true,
        [Attachment.APPLICATION_KEY]: this.application.application,
        category: "providers",
        [Attachment.DUBBO_VERSION_KEY]: this.application.version,
        generic: false,
        heartbeat: this.application.heartbeat,
        [Attachment.INTERFACE_KEY]: name,
        [Attachment.METHODS_KEY]: methods.join(','),
        [Attachment.PID_KEY]: this.application.pid,
        side: 'provider',
        [Attachment.TIMESTAMP_KEY]: Date.now(),
        [Attachment.VERSION_KEY]: options.version || '0.0.0',
        [Attachment.GROUP_KEY]: options.group || '*',
        [Attachment.RETRIES_KEY]: this.application.retries,
        [Attachment.TIMEOUT_KEY]: this.application.timeout,
      }
    }
    const dubboInterfaceURL = format(obj);
    const interface_root_path = `/${this.application.root}/${name}`;
    const interface_dir_path = interface_root_path + '/providers';
    const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(dubboInterfaceURL);
    this.providerNodes.add(interface_entry_path);
    return this;
  }

  /**
   * Provider: 创建节点
   * 并且触发 node:create 事件
   */
  private async publishProviderNodes() {
    for (const node of this.providerNodes) {
      await this.create(node);
    }
  }

  /**
   * Provider: 删除节点
   * 并且触发 node:remove 事件
   */
  private async unPublishProviderNodes() {
    for (const node of this.providerNodes) {
      await this.remove(node);
    }
  }

  // public async onProviderPublish() {
  //   await this.connect();
  //   await Promise.all(Array.from(this.values()).map(url => this.create(url)));
  // }

  // public async onConsumerRegister(name: string, options: { group?: string, version?: string } = {}) {
  //   const obj = {
  //     protocol: "consumer",
  //     slashes: true,
  //     host: `${localhost}/${name}`,
  //     query: {
  //       [Attachment.APPLICATION_KEY]: this.application.application,
  //       category: "consumers",
  //       [Attachment.DUBBO_VERSION_KEY]: this.application.version,
  //       [Attachment.INTERFACE_KEY]: name,
  //       [Attachment.PID_KEY]: this.application.pid,
  //       side: 'consumer',
  //       [Attachment.TIMESTAMP_KEY]: Date.now(),
  //       [Attachment.VERSION_KEY]: options.version || '0.0.0',
  //       [Attachment.GROUP_KEY]: options.group || '*',
  //     }
  //   }
  //   const dubboInterfaceURL = format(obj);
  //   const interface_root_path = `/${this.application.root}/${name}`;
  //   const interface_dir_path = interface_root_path + '/consumers';
  //   const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(dubboInterfaceURL);
  //   await this.create(interface_entry_path);
  //   return interface_entry_path;
  // }

  // public onConsumerUnRegister(url: string) {
  //   return this.remove(url);
  // }

  // public async onConsumerQuery(name: string, options: { group?: string, version?: string } = {}) {
  //   const group = options.group || '*';
  //   const version = options.version || '0.0.0';
  //   const path = `/${this.application.root}/${name}/providers`;
  //   const urls = (await this.query(path)) || [];
  //   return urls.map(url => {
  //     const URI = parse(decodeURIComponent(url), true);
  //     if (this.channelMatchRule && this.channelMatchRule(URI, {
  //       interface: name,
  //       group, version,
  //     })) return URI;
  //     const interfaceMatched = URI.query[Attachment.INTERFACE_KEY] === name || URI.query[Attachment.PATH_KEY] === name;
  //     const groupMatched = group === '*' ? true : (URI.query[Attachment.GROUP_KEY] === group);
  //     const versionMatched = version === '0.0.0' ? true : URI.query[Attachment.VERSION_KEY] === version;
  //     if (interfaceMatched && groupMatched && versionMatched) return URI;
  //     return null;
  //   }).filter(Boolean);
  // }

  // public onConsumerConnect() {
  //   return this.connect();
  // }

  // public onConsumerDisconnect() {
  //   return this.close();
  // }

  // public async onProviderUnPublish() {
  //   await Promise.all(Array.from(this.values()).map(url => this.remove(url)));
  //   await this.close();
  // }

  private async connect() {
    await new Promise<void>(resolve => {
      this.zookeeper.once('connected', resolve);
      this.zookeeper.connect();
    });
    await this.emitAsync('start');
  }

  private async close() {
    await new Promise<void>(resolve => {
      this.zookeeper.close();
      resolve();
    });
    await this.emitAsync('stop');
  }

  private exists(uri: string) {
    return new Promise<boolean>((resolve, reject) => {
      this.zookeeper.exists(uri, (err, stat) => {
        if (err) return reject(err);
        return resolve(!!stat);
      });
    });
  }
  
  public async create(url: string) {
    const sp = url.split('/');
    let path: string = '';
    for (let i = 1; i < sp.length; i++) {
      path = path + '/' + sp[i];
      const mode = i === sp.length - 1 
        ? CreateMode.EPHEMERAL 
        : CreateMode.PERSISTENT;
      await this._create(path, mode);
    }
    await this.emitAsync('node:create', path);
  }

  private async _create(uri: string, mode: number) {
    if (!(await this.exists(uri))) {
      return await new Promise<string>((resolve, reject) => {
        this.zookeeper.create(uri, mode, (err, node) => {
          if (err) return reject(err);
          resolve(node);
        })
      })
    }
  }

  public async remove(uri: string) {
    if (await this.exists(uri)) {
      await new Promise<void>((resolve, reject) => {
        this.zookeeper.remove(uri, err => {
          if (err) return reject(err);
          resolve();
        })
      });
      await this.emitAsync('node:remove', uri);
    }
  }

  public query(path: string, watchlistener?: (event: Event) => void) {
    return new Promise<string[]>((resolve, reject) => {
      const callback = (err: Error, children: string[], stat?: Stat) => {
        if (err) return reject(err);
        if (stat) return resolve(children);
        return reject(new Error('cannot find zookeeper path:' + path));
      };
      if (watchlistener) {
        this.zookeeper.getChildren(path, watchlistener, callback);
      } else {
        this.zookeeper.getChildren(path, callback);
      }
    })
  }
}