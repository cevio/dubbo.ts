import { UrlWithParsedQuery } from 'url';
import { EventEmitter } from 'events';
import { TConsumerChannel } from '@dubbo.ts/application';
import { getFinger } from './finger';
export class Balance<T extends TConsumerChannel = TConsumerChannel> extends EventEmitter {
  private readonly channels: Map<string, { channel: T, disconnect: () => void }> = new Map();

  constructor(public readonly id: string) {
    super();
  }

  public async setManyChannels(uris: UrlWithParsedQuery[], callback: (host: string, port: number) => T) {
    await this.clear();
    for (let i = 0; i < uris.length; i++) {
      const hostname = uris[i].hostname;
      const port = Number(uris[i].port);
      const id = getFinger(hostname, port);
      const channel = callback(hostname, port);
      const disconnect = this.disconnect(id);
      this.channels.set(id, { channel, disconnect });
      channel.on('disconnect', disconnect);
    }
  }

  private disconnect(id: string) {
    return () => {
      this.channels.delete(id);
      if (!this.channels.size) {
        this.emit('disconnect');
      }
    }
  }

  public getOne(): T {
    const channels = Array.from(this.channels.values());
    if (!channels.length) return;
    const chunk = channels.reduce((prev, next) => {
      if (prev.channel.count > next.channel.count) return next;
      return prev;
    });
    return chunk.channel;
  }

  public async clear() {
    await Promise.all(Array.from(this.channels.values()).map(chunk => {
      chunk.channel.removeListener('disconnect', chunk.disconnect);
      return chunk.channel.close();
    }));
    this.channels.clear();
  }
}