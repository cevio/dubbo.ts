import { ConsumerServiceInitOptions, Logger, getProviderServiceChunkId } from "../utils";
import Registry from "../registry";
import Invoker from './invoker';

export default class Consumer {
  public readonly application: string;
  public readonly root: string;
  public readonly version: string;
  public readonly registry: Registry;
  public readonly pid: number;
  public readonly logger: Logger;
  public readonly pick_timeout: number;
  private readonly storage: Map<string, Invoker> = new Map();
  constructor(options: ConsumerServiceInitOptions) {
    this.application = options.application;
    this.root = options.root || 'dubbo';
    this.version = options.dubbo_version;
    this.registry = options.registry;
    this.pid = options.pid;
    this.logger = options.logger || console;
    this.pick_timeout = options.pickTimeout || 3000;
  }

  async get(interfacename: string, version?: string, group?: string) {
    group = group || '-';
    version = version || '0.0.0';
    const id = getProviderServiceChunkId(interfacename, group, version);
    if (this.storage.has(id)) return this.storage.get(id);
    const invoker = new Invoker(this, interfacename, version, group);
    this.storage.set(id, invoker);
    await invoker.register();
    await invoker.subscribe(id);
    return invoker;
  }

  async close() {
    for (const [id, invoker] of this.storage) {
      await invoker.close();
    }
    this.registry.close();
  }

  async listen() {
    if (!this.registry.connected) await this.registry.connect();
  }
}