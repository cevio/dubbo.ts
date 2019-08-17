import Provider from './index';
import { ProviderServiceChunkInitOptions, getProviderServiceChunkId, localhost, CREATE_MODES } from '../utils';
import * as url from 'url';

export default class ServiceChunk<T = any> {
  private provider: Provider;
  public readonly interfacename: string;
  public readonly interfacegroup: string;
  public readonly interfaceversion: string;
  public readonly interfacerevision: string;
  public readonly interfacemethods: string[];
  public readonly interfacedelay: number;
  public readonly interfaceretries: number;
  public readonly interfacetimout: number;
  public readonly interfacetarget: T;
  private path: string;
  constructor(provider: Provider, options: ProviderServiceChunkInitOptions) {
    this.provider = provider;
    this.interfacename = options.interface;
    this.interfacegroup = options.group || '-';
    this.interfaceversion = options.version || '0.0.0';
    this.interfacerevision = options.revision || this.interfaceversion;
    this.interfacemethods = options.methods || [];
    this.interfacedelay = options.delay === undefined ? -1 : options.delay;
    this.interfaceretries = options.retries || 2;
    this.interfacetimout = options.timeout || 3000;
  }

  get id() {
    return getProviderServiceChunkId(this.interfacename, this.interfacegroup, this.interfaceversion);
  }

  setValue(value: T) {
    if (this.interfacetarget !== undefined) throw this.provider.error('Chunk.set', this.id + ' has already setted value.');
    Object.defineProperty(this, 'interfacetarget', {
      get() {
        return value;
      }
    });
  }

  async register() {
    const obj = {
      protocol: "dubbo",
      slashes: true,
      host: `${localhost}:${this.provider.port}/${this.interfacename}`,
      query: {
        anyhost: true,
        application: this.provider.application,
        category: "providers",
        dubbo: this.provider.version,
        generic: false,
        heartbeat: this.provider.heartbeat,
        interface: this.interfacename,
        methods: this.interfacemethods.join(','),
        pid: this.provider.pid,
        revision: this.interfacerevision,
        side: 'provider',
        timestamp: Date.now(),
        version: this.interfaceversion,
        'default.group': this.interfacegroup,
        'default.delay': this.interfacedelay,
        'default.retries': this.interfaceretries,
        'default.timeout': this.interfacetimout,
      }
    }
    const interface_root_path = `/${this.provider.root}/${this.interfacename}`;
    const interface_dir_path = interface_root_path + '/providers';
    const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(url.format(obj));
    await this.provider.registry.create(interface_root_path, CREATE_MODES.PERSISTENT);
    await this.provider.registry.create(interface_dir_path, CREATE_MODES.PERSISTENT);
    await this.provider.registry.create(interface_entry_path, CREATE_MODES.EPHEMERAL);
    this.path = interface_entry_path;
    return this;
  }

  unRegister() {
    return this.provider.registry.remove(this.path);
  }
}