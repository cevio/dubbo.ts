import * as net from 'net';
import { EventEmitter } from '@nelts/utils';
import Registry from '../registry';
import Interface, { InterfaceOptions } from './interface';
import { ProviderRegisterUri, zookeeperCreateNode, zookeeperRemoveNode, ip, CREATE_MODES } from '../utils';
import Connection from './connection';
import Context from './context';

export type ProviderOptions = {
  application: string,
  root?: string,
  dubbo_version: string,
  port: number,
  pid: number,
  registry: Registry,
}

export default class Provider extends EventEmitter {
  private readonly _application: string;
  private readonly _root: string;
  private readonly _version: string;
  private readonly _registry: Registry;
  private readonly _port: number;
  private readonly _pid: number;
  private _register_uris: string[];
  private _services: Interface[] = [];
  private readonly _services_map: {
    [group: string]: {
      [interfacename: string]: {
        [version: string]: Interface
      }
    }
  } = {};

  constructor(options: ProviderOptions) {
    super();
    this._application = options.application;
    this._root = options.root || 'dubbo';
    this._version = options.dubbo_version;
    this._registry = options.registry;
    this._port = options.port;
    this._pid = options.pid;
  }

  get version() {
    return this._version;
  }

  get services() {
    return this._services_map;
  }

  addService(data: InterfaceOptions) {
    const service = new Interface(data);
    const group = service.serviceGroup || '-';
    const version = service.serviceVersion;
    const interfacename = service.serviceInterface;
    if (!this._services_map[group]) this._services_map[group] = {};
    if (!this._services_map[group][interfacename]) this._services_map[group][interfacename] = {};
    if (this._services_map[group][interfacename][version]) {
      throw new Error(`service interface[${interfacename}:${version}@${group || '-'}] has already exists.`);
    }
    this._services_map[group][interfacename][version] = service;
    this._services.push(service);
    return this;
  }

  async connection(socket: net.Socket) {
    const conn = new Connection(this, socket);
    conn.on('packet', (ctx: Context) => this.sync('packet', ctx));
  }

  async publish() {
    const host = ip() + ':' + this._port;
    this._register_uris = await Promise.all(this._services.map(async service => {
      const {
        interface_root_path,
        interface_dir_path,
        interface_entry_path,
      } = ProviderRegisterUri(this._root, host, this._application, this._version, this._pid, {
        interface: service.serviceInterface,
        version: service.serviceVersion,
        revision: service.serviceRevision,
        group: service.serviceGroup,
        delay: service.serviceDefaultDeplay,
        retries: service.serviceDefaultRetries,
        timeout: service.serviceDefaultTimeout,
        methods: service.serviceMethods,
      });
      await zookeeperCreateNode(this._registry, interface_root_path, CREATE_MODES.PERSISTENT);
      await zookeeperCreateNode(this._registry, interface_dir_path, CREATE_MODES.PERSISTENT);
      await zookeeperCreateNode(this._registry, interface_entry_path, CREATE_MODES.EPHEMERAL);
      return interface_entry_path
    }));
    return this;
  }

  unPublish() {
    return Promise.all(this._register_uris.map(uri => zookeeperRemoveNode(this._registry, uri)));
  }
}