import { createProcessListener, Events } from '@dubbo.ts/utils';
import { TProvider, TProviderBaseEvents } from "./provider";
import { TConsumer, TConsumerBaseEvents } from "./consumer";
import { TRegistry, TRegistryBaseEvents } from './registry';

export * from './registry';
export * from './provider';
export * from './consumer';

export class Application extends Events<{ 
  mounted: [], 
  unmounted: [],
  start: [], 
  stop: [],
  error: [Error],
  ['provider:start']: [TProvider<any>],
  ['provider:stop']: [TProvider<any>],
  ['consumer:start']: [TConsumer<any>],
  ['consumer:stop']: [TConsumer<any>],
  ['registry:start']: [TRegistry<any>],
  ['registry:stop']: [TRegistry<any>],
}> {
  private readonly configs = new Map<string, any>();
  private readonly listener: ReturnType<typeof createProcessListener>;
  public registry: TRegistry<any>;
  public provider: TProvider<any>;
  public consumer: TConsumer<any>;

  constructor() {
    super();
    this.listener = createProcessListener(
      () => this.stop(),
      e => this.emitAsync('error', e)
    );
  }

  async start() {
    await this.emitAsync('mounted');
    this.listener.addProcessListener();
    await this.emitAsync('start');
  }

  async stop() {
    await this.emitAsync('unmounted');
    await this.emitAsync('stop');
  }
  
  set port(value: number) {
    this.configs.set('port', value);
  }

  get port() {
    return this.configs.has('port') ? this.configs.get('port') : 5000;
  }

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
    return this.configs.get('anyhost') || true;
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

  public useRegistry<T extends TRegistryBaseEvents>(registry: TRegistry<T>) {
    this.registry = registry;
    registry.on('start', () => this.emitAsync('registry:start', registry));
    registry.on('stop', async () => {
      const registry = this.registry;
      this.registry = null;
      await this.emitAsync('registry:stop', registry);
    })
    return this;
  }

  public useProvider<T extends TProviderBaseEvents>(provider: TProvider<T>) {
    this.provider = provider;
    provider.on('start', () => this.emitAsync('provider:start', provider));
    provider.on('stop', async () => {
      const provider = this.provider;
      this.provider = null;
      await this.emitAsync('provider:stop', provider);
    });
    return this;
  }

  public useConsumer<T extends TConsumerBaseEvents>(consumer: TConsumer<T>) {
    this.consumer = consumer;
    consumer.on('start', () => this.emitAsync('consumer:start', consumer));
    consumer.on('stop', async () => {
      const consumer = this.consumer;
      this.consumer = null;
      await this.emitAsync('consumer:stop', consumer);
    })
    return this;
  }
}