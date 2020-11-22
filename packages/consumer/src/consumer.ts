import { EventEmitter } from 'events';
import { Application } from '@dubbo.ts/application';
import { createProcessListener } from '@dubbo.ts/utils';
import { Channel } from './channel';
import { getFinger, getRegistryFinger } from './finger';
import { Balance } from './balance';
export class Consumer extends EventEmitter {
  private readonly channels: Map<string, Channel> = new Map();
  private readonly balance: Balance = new Balance((host, port) => this.connect(host, port));
  private readonly listener = createProcessListener(
    () => this.close(),
    e => this.emit('error', e)
  );
  constructor(public readonly application: Application) {
    super();
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
  public async invoke(name: string, options: { version?: string, group?: string }) {
    const id = getRegistryFinger(name, options);
    if (this.balance.has(id)) return await this.balance.getOne(id);
    const result = await this.application.onConsumerQuery(name, options);
    this.emit('channels', result);
    if (!result.length) throw new Error('cannot find any host');
    this.balance.setMany(id, result);
    return await this.balance.getOne(id);
  }

  public launch() {
    this.listener.addProcessListener();
  }

  async close() {
    const pools: Promise<void>[] = [];
    for (const [, client] of this.channels) {
      pools.push(client.close());
    }
    await Promise.all(pools);
  }
}