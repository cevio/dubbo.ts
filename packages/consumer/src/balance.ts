import { Channel } from './channel';
import { UrlWithParsedQuery } from 'url';
import { getFinger } from './finger';
export class Balance extends Map<string, Map<string, {
  host: string,
  port: number,
  channel?: Channel,
  count: number
}>> {
  constructor(private readonly connect: (host: string, port: number) => Channel) {
    super();
  }

  public setMany(id: string, result: UrlWithParsedQuery[]) {
    if (!this.has(id)) this.set(id, new Map());
    const chunk = this.get(id);
    result.forEach(res => {
      const _id = getFinger(res.host, Number(res.port));
      if (!chunk.has(_id)) {
        chunk.set(_id, {
          host: res.hostname,
          port: Number(res.port),
          count: 0,
          channel: null,
        })
      }
    });
  }

  public getOne(id: string, callback: (channel: Channel) => void): Channel {
    const chunks = this.get(id);
    const values = Array.from(chunks.values());
    const minValue = Math.min(...values.map(chunk => chunk.count));
    let i = values.length;
    while (i--) {
      if (values[i].count === minValue) {
        values[i].count++;
        if (!values[i].channel) {
          const channel = this.connect(values[i].host, values[i].port);
          callback(channel);
          channel.on('disconnect', () => {
            values[i].channel = null;
            values[i].count = 0;
          })
          values[i].channel = channel;
          return channel;
        } else {
          return values[i].channel;
        }
      }
    }
    throw new Error('cannot find channel');
  }
}