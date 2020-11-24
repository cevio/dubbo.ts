import { TRegistry, Application } from '@dubbo.ts/application';
import { Client, createClient, CreateMode, Stat, Event } from 'node-zookeeper-client';
import { localhost } from '@dubbo.ts/utils';
import { Attachment } from '@dubbo.ts/protocol';
import { format, parse, UrlWithParsedQuery } from 'url';

export interface TZooKeeperOptions {
  host: string,
  sessionTimeout?: number,
  spinDelay?: number,
  retries?: number,
}

type TChannelMatchHandler = (uri: UrlWithParsedQuery, options: {
  interface: string,
  group?: string,
  version: string,
}) => boolean;

export class ZooKeeper extends Set<string> implements TRegistry {
  private readonly zookeeper: Client;
  private channelMatchRule: TChannelMatchHandler;
  constructor(private readonly application: Application, options: TZooKeeperOptions = { host: localhost }) {
    super();
    this.zookeeper = createClient(options.host, {
      sessionTimeout: options.sessionTimeout || 30000,
      spinDelay: options.spinDelay || 1000,
      retries: options.retries || 0,
    });
    this.application.useRegistry(this);
  }

  public setChannelMatcher(callback: TChannelMatchHandler) {
    this.channelMatchRule = callback;
    return this;
  }

  get host() {
    return `${localhost}:${this.application.port}`;
  }

  public addService(name: string, methods: string[], options: { group?: string, version?: string } = {}) {
    const obj = {
      protocol: "dubbo",
      slashes: true,
      host: `${this.host}/${name}`,
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
    this.add(interface_entry_path);
    return this;
  }

  public async onProviderPublish() {
    await this.connect();
    await Promise.all(Array.from(this.values()).map(url => this.create(url)));
  }

  public async onConsumerRegister(name: string, options: { group?: string, version?: string } = {}) {
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
    await this.create(interface_entry_path);
    return interface_entry_path;
  }

  public onConsumerUnRegister(url: string) {
    return this.remove(url);
  }

  public async onConsumerQuery(name: string, options: { group?: string, version?: string } = {}) {
    const group = options.group || '*';
    const version = options.version || '0.0.0';
    const path = `/${this.application.root}/${name}/providers`;
    const urls = (await this.query(path)) || [];
    return urls.map(url => {
      const URI = parse(decodeURIComponent(url), true);
      if (this.channelMatchRule && this.channelMatchRule(URI, {
        interface: name,
        group, version,
      })) return URI;
      const interfaceMatched = URI.query[Attachment.INTERFACE_KEY] === name || URI.query[Attachment.PATH_KEY] === name;
      const groupMatched = group === '*' ? true : (URI.query[Attachment.GROUP_KEY] === group);
      const versionMatched = version === '0.0.0' ? true : URI.query[Attachment.VERSION_KEY] === version;
      if (interfaceMatched && groupMatched && versionMatched) return URI;
      return null;
    }).filter(Boolean);
  }

  public onConsumerConnect() {
    return this.connect();
  }

  public onConsumerDisconnect() {
    return this.close();
  }

  public async onProviderUnPublish() {
    await Promise.all(Array.from(this.values()).map(url => this.remove(url)));
    await this.close();
  }

  private connect() {
    return new Promise<void>(resolve => {
      this.zookeeper.once('connected', resolve);
      this.zookeeper.connect();
    });
  }

  private close() {
    return new Promise<void>(resolve => {
      this.zookeeper.close();
      resolve();
    });
  }

  private exists(uri: string) {
    return new Promise<boolean>((resolve, reject) => {
      this.zookeeper.exists(uri, (err, stat) => {
        if (err) return reject(err);
        return resolve(!!stat);
      });
    });
  }
  
  private async create(url: string) {
    const sp = url.split('/');
    let path: string = '';
    for (let i = 1; i < sp.length; i++) {
      path = path + '/' + sp[i];
      const mode = i === sp.length - 1 
        ? CreateMode.EPHEMERAL 
        : CreateMode.PERSISTENT;
      await this._create(path, mode);
    }
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

  private async remove(uri: string) {
    if (await this.exists(uri)) {
      return await new Promise<void>((resolve, reject) => {
        this.zookeeper.remove(uri, err => {
          if (err) return reject(err);
          resolve();
        })
      })
    }
  }

  private query(path: string, watchlistener?: (event: Event) => void) {
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