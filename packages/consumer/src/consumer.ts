import { EventEmitter } from 'events';
import { Application } from '@dubbo.ts/application';
import { createProcessListener } from '@dubbo.ts/utils';
import { Channel } from './channel';
import { getFinger } from './finger';
export class Consumer extends EventEmitter {
  private readonly channels: Map<string, Channel> = new Map();
  private readonly listener = createProcessListener(
    () => this.close(),
    e => this.emit('error', e)
  );
  constructor(public readonly application: Application) {
    super();
  }

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

  public invoke(name: string) {

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