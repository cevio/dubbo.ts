import { TRegistry } from "./registry";

export * from './registry';

export class Application {
  private readonly configs = new Map<string, any>();
  private registry: TRegistry;

  set root(value: string) {
    this.configs.set('root', value);
  }

  get root(): string {
    return this.configs.has('root') ? this.configs.get('root') : 'dubbo';
  }
  
  set version(value: string) {
    this.configs.set('dubbo', value);
  }

  get version(): string {
    return this.configs.has('dubbo') ? this.configs.get('dubbo') : '2.0.2';
  }

  set cluster(value: string) {
    this.configs.set('cluster', value);
  }

  get cluster(): string {
    return this.configs.get('cluster');
  }

  get pid(): number {
    return process.pid;
  }

  set monitor(value: string) {
    this.configs.set('monitor', value);
  }

  get monitor(): string {
    return this.configs.get('monitor');
  }

  set timeout(value: number) {
    this.configs.set('timeout', value);
  }

  get timeout(): number {
    return this.configs.has('timeout') ? this.configs.get('timeout') : 20000;
  }

  set application(value: string) {
    this.configs.set('application', value);
  }

  get application(): string {
    return this.configs.get('application');
  }

  set anyHost(value: boolean) {
    this.configs.set('anyhost', value);
  }

  get anyHost(): boolean {
    return this.configs.get('anyhost') || false;
  }

  set register(value: boolean) {
    this.configs.set('register', value);
  }

  get register() {
    return this.configs.get('register') || false;
  }

  set heartbeat(value: number) {
    this.configs.set('heartbeat', value);
  }

  get heartbeat() {
    return this.configs.has('heartbeat') ? this.configs.get('heartbeat') : 60000;
  }

  set retries(value: number) {
    this.configs.set('retries', value);
  }

  get retries() {
    return this.configs.has('retries') ? Number(this.configs.get('retries')) : 3;
  }

  public onRegistryConnect() {
    if (this.registry) {
      return this.registry.connect();
    }
  }

  public onRegistryClose() {
    if (this.registry) {
      return this.registry.close();
    }
  }

  public onRegistryCreate(url: string) {
    if (this.registry) {
      return this.registry.create(url);
    }
  }

  public onRegistryRemove(url: string) {
    if (this.registry) {
      return this.registry.remove(url);
    }
  }

  public onRegistryQuery(url: string) {
    if (this.registry) {
      return this.registry.query(url);
    }
  }

  public useRegistry<T extends TRegistry>(registry: T) {
    this.registry = registry;
    return registry;
  }
}