import { UrlWithParsedQuery } from 'url';
import { EventEmitter } from 'events';
import { TConsumerChannel } from '@dubbo.ts/application';
import { getFinger } from './finger';
export class Balance<T extends TConsumerChannel = TConsumerChannel> extends EventEmitter {
  private readonly channels: Map<string, T> = new Map();

  constructor(public readonly id: string) {
    super();
  }

  public setManyChannels(uris: UrlWithParsedQuery[], callback: (host: string, port: number) => T) {
    this.channels.clear();
    for (let i = 0; i < uris.length; i++) {
      const hostname = uris[i].hostname;
      const port = Number(uris[i].port);
      const id = getFinger(hostname, port);
      const channel = callback(hostname, port);
      this.channels.set(id, channel);
      channel.on('disconnect', ((_id) => {
        return () => {
          this.channels.delete(_id);
          if (!this.channels.size) {
            this.emit('disconnect');
          }
        }
      })(id));
    }
  }

  public getOne(): T {
    return Array.from(this.channels.values()).reduce((prev, next) => {
      if (prev.count > next.count) return next;
      return prev;
    });
  }
}