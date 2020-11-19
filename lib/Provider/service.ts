import { Provider } from ".";
import { format } from 'url';
import { TRegistry } from "../Registry/interface";
import { localhost } from "../utils";
import { TServiceOptions } from "./interface";

export class Service<R extends TRegistry> {
  public readonly datasource: any;
  private readonly path: string;
  constructor(
    private readonly provider: Provider<R>, 
    private readonly options: TServiceOptions
  ) {
    if (!this.options.group) this.options.group = 'default';
    if (!this.options.version) this.options.version = '0.0.0';
    if (!this.options.revision) this.options.revision = this.options.version;
    if (!this.options.methods) this.options.methods = [];
    if (this.options.delay === undefined) this.options.delay = -1;
    if (!this.options.retries) this.options.retries = 2;
    if (!this.options.timeout) this.options.timeout = 3000;
  }

  get host() {
    return `${localhost}:${this.provider.options.port}`;
  }

  bind<T = any>(data: T) {
    if (this.datasource) throw new Error(`
      datasource of interface: ${this.options.interface} has already exists.
    `);
    Object.defineProperty(this, 'datasource', {
      get: () => data,
    });
    return this;
  }

  public async publish() {
    const obj = {
      protocol: this.provider.options.registry.options.dubboRootName,
      slashes: true,
      host: `${this.host}/${this.options.interface}`,
      query: {
        anyhost: true,
        application: this.provider.options.application,
        category: "providers",
        dubbo: this.provider.options.registry.options.dubboVersion,
        generic: false,
        heartbeat: this.provider.options.heartbeat,
        interface: this.options.interface,
        methods: this.options.methods.join(','),
        pid: this.provider.options.pid,
        revision: this.options.revision,
        side: 'provider',
        timestamp: Date.now(),
        version: this.options.version,
        'default.group': this.options.group,
        'default.delay': this.options.delay,
        'default.retries': this.options.retries,
        'default.timeout': this.options.timeout,
      }
    }
    if (obj.query['default.group'] === 'default') delete obj.query['default.group'];
    const dubboInterfaceURL = format(obj);
    const interface_entry_path = '/' + this.provider.options.registry.options.dubboRootName + '/' + this.options.interface + '/providers/' + encodeURIComponent(dubboInterfaceURL);
    await this.provider.options.registry.create(interface_entry_path);
    Object.defineProperty(this, 'path', {
      get: () => interface_entry_path,
    });
    this.provider.emit('publish', interface_entry_path);
    return this;
  }

  public async unpublish() {
    if (this.path) {
      await this.provider.options.registry.remove(this.path);
      this.provider.emit('unpublish', this.path);
    }
  }
}