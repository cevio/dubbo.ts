import { EventEmitter } from 'events';
import { Application } from '@dubbo.ts/application';
import { Events } from '@dubbo.ts/utils';
import { Channel } from './channel';
import { getFinger, getRegistryFinger } from './finger';
import { Balance } from './balance';
import { Invocation } from './invocation';

export type TConsumerEvents = { mounted: [], unmounted: [] }

export class Consumer<E extends TConsumerEvents = TConsumerEvents> extends EventEmitter {
  private readonly channels: Map<string, Channel<E>> = new Map();
  private readonly balance: Balance<E> = new Balance((host, port) => this.connect(host, port));
  private readonly invokers = new Invocation();
  public readonly lifecycle = new Events<E>();
  constructor(public readonly application: Application) {
    super();
    this.application.on('unmounted', () => this.close());
  }

  // 直连模式
  public connect(host: string, port: number) {
    const id = getFinger(host, port);
    if (!this.channels.has(id)) {
      const channel = new Channel<E>(host, port, this);
      this.channels.set(id, channel);
    }
    return this.channels.get(id);
  }

  public deleteChannel(channel: Channel<E>) {
    if (this.channels.has(channel.id)) {
      this.channels.delete(channel.id);
    }
    return this;
  }

  // 注册中心模式
  public async invoke(name: string, options: { version?: string, group?: string } = {}) {
    const id = getRegistryFinger(name, options);
    if (!this.balance.has(id)) {
      await this.invokers.fetch(id, async () => {
        const result = await this.application.onConsumerQuery(name, options);
        this.emit('channels', result);
        if (!result.length) throw new Error('cannot find any host');
        this.balance.setMany(id, result);
      });
    }
    return this.balance.getOne(id, (channel) => {
      channel.lifecycle.on('mounted', async () => {
        const path = await this.application.onConsumerRegister(name, options);
        channel.lifecycle.on('unmounted', () => this.application.onConsumerUnRegister(path));
      })
    });
  }

  public async launch() {
    this.application.notify();
    await this.application.onConsumerConnect();
    await this.lifecycle.emitAsync('mounted');
  }

  public async close() {
    const pools: Promise<void>[] = [];
    for (const [, client] of this.channels) {
      pools.push(client.close());
    }
    await Promise.all(pools);
    await this.application.onConsumerDisconnect();
    await this.lifecycle.emitAsync('unmounted');
  }
}