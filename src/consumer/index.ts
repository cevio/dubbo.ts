import { ConsumerRegisterUri, ip, zookeeperCreateNode, CREATE_MODES, zookeeperRemoveNode, zookeeperExistsNode } from '../utils';
import { EventEmitter } from '@nelts/utils';
import Registry from '../registry';
import Invoker from './invoker';
import * as url from 'url';
import * as zookeeper from 'node-zookeeper-client';
type ConsumerLogger = {
  error(...args: any[]): void
}
export type ConsumerOptions = {
  application: string,
  root?: string,
  dubbo_version: string,
  pid: number,
  registry: Registry,
  heartbeat?: number,
  heartbeatTimeout?: number,
  logger?: ConsumerLogger,
}

export default class Consumers extends EventEmitter {
  private readonly _application: string;
  private readonly _root: string;
  private readonly _version: string;
  private readonly _registry: Registry;
  private readonly _pid: number;
  private readonly _logger: ConsumerLogger;
  private readonly _heartbeat: number;
  private readonly _heartbeat_timeout: number;
  private readonly _services: Map<string, Invoker> = new Map();
  private _uris: string[] = [];
  constructor(options: ConsumerOptions) {
    super();
    this._application = options.application;
    this._root = options.root || 'dubbo';
    this._version = options.dubbo_version;
    this._registry = options.registry;
    this._pid = options.pid;
    this._heartbeat = options.heartbeat || 60000;
    this._heartbeat_timeout = options.heartbeatTimeout || this._heartbeat * 3;
    this._logger = options.logger || console;
  }

  get logger() {
    return this._logger;
  }

  get version() {
    return this._version;
  }

  get application() {
    return this._application;
  }

  get root() {
    return this._root;
  }

  get heartbeat() {
    return this._heartbeat;
  }

  get heartbeatTimeout() {
    return this._heartbeat_timeout;
  }

  close(callback: Function) {
    for (const [id, invoker] of this._services) invoker.close();
    Promise.all(this._uris.map(uri => zookeeperRemoveNode(this._registry, uri)))
      .then(() => callback(null))
      .catch(e => callback(e));
  }

  whenServiceChange(id: string, event: zookeeper.Event) {
    switch (event.getName()) {
      case 'NODE_CREATED': return this.NODE_CREATED(id, event);
      case 'NODE_DELETED': return this.NODE_DELETED(id, event);
      case 'NODE_DATA_CHANGED': return this.NODE_DATA_CHANGED(id, event);
      case 'NODE_CHILDREN_CHANGED': return this.NODE_CHILDREN_CHANGED(id, event);
    }
  }

  private NODE_CREATED(id: string, event: zookeeper.Event) {

  }
  private NODE_DELETED(id: string, event: zookeeper.Event) {

  }
  private NODE_DATA_CHANGED(id: string, event: zookeeper.Event) {

  }
  private async NODE_CHILDREN_CHANGED(id: string, event?: zookeeper.Event) {
    const list: string[] = await new Promise((resolve, reject) => {
      this._registry.zk.getChildren(event.path, (event) => this.whenServiceChange(id, event), (err: Error, children: string[], stat?: zookeeper.Stat) => {
        if (err) return reject(err);
        if (stat) return resolve(children);
      })
    });
    if (list.length && this._services.has(id)) {
      const invoker = this._services.get(id);
      const URIS: url.UrlWithParsedQuery[] = []
      for (let i = 0; i < list.length; i++) {
        const URI = url.parse(decodeURIComponent(list[i]), true);
        if (URI.query.interface === invoker.interface && URI.query.version === invoker.version && (URI.query['default.grouop'] || '') === invoker.group) {
          URIS.push(URI);
        }
      }
      await invoker.check(URIS);
    }
  }

  async create(interfacename: string, version?: string, group?: string) {
    group = group || '';
    version = version || '0.0.0';
    const id = `${interfacename}:${version}@${group||''}`;
    if (this._services.has(id)) return this._services.get(id);
    const invoker = new Invoker(this, interfacename, version, group);
    this._services.set(id, invoker);
    const host = ip();
    const { interface_root_path, interface_dir_path, interface_entry_path } = ConsumerRegisterUri(this._root, host, this._application, this._version, this._pid, {
      interface: interfacename,
      version,
      group
    });
    if (!(await zookeeperExistsNode(this._registry, interface_root_path))) throw new Error('cannot find Provider of ' + interfacename);
    await zookeeperCreateNode(this._registry, interface_dir_path, CREATE_MODES.PERSISTENT);
    await zookeeperCreateNode(this._registry, interface_entry_path, CREATE_MODES.EPHEMERAL);
    this._uris.push(interface_entry_path);
    const list: string[] = await new Promise((resolve, reject) => {
      this._registry.zk.getChildren(
        interface_root_path + '/providers', 
        (event) => this.whenServiceChange(id, event),
        (err: Error, children: string[], stat?: zookeeper.Stat) => {
          if (err) return reject(err);
          if (stat) return resolve(children);
          return reject(new Error('cannot find Provider of ' + interfacename));
        }
      )
    });
    if (list.length) {
      const URIS: url.UrlWithParsedQuery[] = []
      for (let i = 0; i < list.length; i++) {
        const URI = url.parse(decodeURIComponent(list[i]), true);
        if (URI.query.interface === interfacename && URI.query.version === version && (URI.query['default.grouop'] || '') === group) {
          URIS.push(URI);
        }
      }
      if (URIS.length) await Promise.all(URIS.map(uri => invoker.push(uri)));
    }
    return invoker;
  }
}