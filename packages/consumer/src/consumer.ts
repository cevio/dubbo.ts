import { TConsumer, TConsumerBaseEvents } from '@dubbo.ts/application';
import { Application } from '@dubbo.ts/application';
import { Events } from '@dubbo.ts/utils';
import { Channel } from './channel';
import { getFinger/*, getRegistryFinger*/ } from './finger';
// import { Balance } from './balance';
// import { Invocation } from './invocation';
import { UrlWithParsedQuery } from 'url';

export type TConsumerEvents = TConsumerBaseEvents & {
  channels: [UrlWithParsedQuery[]],
  connect: [Channel],
  disconnect: [Channel],
  reconnect: [Channel],
  error: [Error],
  heartbeat: [],
  ['heartbeat:timeout']: [],
};

export class Consumer extends Events<TConsumerEvents> implements TConsumer<TConsumerEvents> {
  private readonly channels: Map<string, Channel> = new Map();
  // private readonly balance: Balance = new Balance((host, port) => this.connect(host, port));
  // private readonly invokers = new Invocation();
  constructor(public readonly application: Application) {
    super();
    // 将启动与关闭流程注册到Application统一管理
    this.application.on('mounted', () => this.launch());
    this.application.on('unmounted', () => this.close());
  }

  // 直连模式
  public connect(host: string, port: number) {
    const id = getFinger(host, port);
    if (!this.channels.has(id)) {
      const channel = new Channel(host, port, this);
      this.channels.set(id, channel);
    }
    return this.channels.get(id);
  }

  public deleteChannel(channel: Channel) {
    if (this.channels.has(channel.id)) {
      this.channels.delete(channel.id);
    }
    return this;
  }

  // 注册中心模式
  // public async invoke(name: string, options: { version?: string, group?: string } = {}) {
  //   if (!this.application.registry) throw new Error('you must setup registry first');
  //   const id = getRegistryFinger(name, options);
  //   if (!this.balance.has(id)) {
  //     await this.invokers.fetch(id, async () => {
  //       const result = await this.application.onConsumerQuery(name, options);
  //       this.emit('channels', result);
  //       if (!result.length) throw new Error('cannot find any host');
  //       this.balance.setMany(id, result);
  //     });
  //   }
  //   return this.balance.getOne(id, (channel) => {
  //     channel.lifecycle.on('mounted', async () => {
  //       const path = await this.application.onConsumerRegister(name, options);
  //       channel.lifecycle.on('unmounted', () => this.application.onConsumerUnRegister(path));
  //     })
  //   });
  // }

  public async launch() {
    await this.emitAsync('start');
  }

  public async close() {
    const pools: Promise<void>[] = [];
    for (const [, client] of this.channels) pools.push(client.close());
    await Promise.all(pools);
    await this.emitAsync('stop');
  }
}