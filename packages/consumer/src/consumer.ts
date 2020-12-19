import { TConsumer, TConsumerBaseEvents } from '@dubbo.ts/application';
import { Application } from '@dubbo.ts/application';
import { Events } from '@dubbo.ts/utils';
import { Channel } from './channel';
import { getFinger } from './finger';
import { UrlWithParsedQuery } from 'url';

export type TConsumerEvents = TConsumerBaseEvents & {
  connect: [Channel],
  disconnect: [Channel],
  reconnect: [number, number],
  error: [Error],
  heartbeat: [],
  ['heartbeat:timeout']: [],
};

export class Consumer extends Events<TConsumerEvents> implements TConsumer<TConsumerEvents> {
  private readonly channels: Map<string, Channel> = new Map();
  constructor(public readonly application: Application) {
    super();
    // 将启动与关闭流程注册到Application统一管理
    this.application.on('mounted', () => this.launch());
    this.application.on('unmounted', () => this.close());
    this.on('error', async err => this.logger.error(err));
  }

  get logger() {
    return this.application.logger;
  }

  // 直连模式
  public connect(host: string, port: number) {
    const id = getFinger(host, port);
    if (!this.channels.has(id)) {
      const channel = new Channel(host, port, this);
      this.channels.set(id, channel);
      channel.on('disconnect', () => this.deleteChannel(channel));
    }
    return this.channels.get(id);
  }

  private deleteChannel(channel: Channel) {
    if (this.channels.has(channel.id)) {
      this.channels.delete(channel.id);
    }
    return this;
  }

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