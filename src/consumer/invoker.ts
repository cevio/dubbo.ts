import * as url from 'url';
import Channel from './channel';
import Consumer from './index';
import { EventEmitter } from '@nelts/utils';
const intersect = require('@evio/intersect');
export default class Invoker extends EventEmitter {
  public readonly app: Consumer;
  private _interfacename: string;
  private _version: string;
  private _group: string;
  private _checking: boolean = false;
  private _services: Map<string, Channel> = new Map();
  constructor(app: Consumer, interfacename: string, version: string, group: string) {
    super();
    this.app = app;
    this._interfacename = interfacename;
    this._version = version;
    this._group = group;
  }

  close() {
    for (const [host, channel] of this._services) channel.close();
  }

  get interface() {
    return this._interfacename;
  }

  get version() {
    return this._version;
  }

  get group() {
    return this._group;
  }

  get checking() {
    return this._checking;
  }

  check(uris: url.UrlWithParsedQuery[]) {
    this._checking = true;
    const map: Map<string, url.UrlWithParsedQuery> = new Map();
    uris.forEach(uri => map.set(uri.host, uri));
    const oldKeys = Array.from(this._services.keys());
    const newKeys = Array.from(map.keys());
    const { adds, removes, commons } = intersect(oldKeys, newKeys);
    return Promise.all([
      this.addNewChannel((<string[]>adds).map(one => map.get(one))),
      this.removeOldChannel(removes as string[]),
      Promise.all((<string[]>commons).map(one => this.resolveCommonChannel(one, map.get(one)))),
    ]).finally(() => this._checking = false);
  }

  private resolveCommonChannel(name: string, chunk: url.UrlWithParsedQuery) {
    const channel = this._services.get(name);
    channel.resolve(chunk);
  }

  private async addNewChannel(chunks: url.UrlWithParsedQuery[]) {
    return Promise.all(chunks.map(chunk => this.push(chunk)));
  }

  private removeOldChannel(chunks: string[]) {
    chunks.forEach(chunk => {
      this._services.get(chunk).close();
      this._services.delete(chunk);
    });
  }

  async push(configs: url.UrlWithParsedQuery) {
    const channel = new Channel(this, configs);
    await channel.connect();
    this._services.set(configs.host, channel);
    return this;
  }

  private pick() {
    let _channel: Channel;
    for (const [name, channel] of this._services) {
      if (!_channel) {
        _channel = channel;
        continue;
      }
      if (channel.active < _channel.active) {
        _channel = channel;
      }
    }
    return _channel;
  }

  async invoke<T = any>(method: string, args: any[]) {
    let _channel = this.pick();
    if (!_channel) {
      await new Promise((resolve, reject) => {
        const startTime = Date.now();
        const timer = setInterval(() => {
          if (Date.now() - startTime > this.app.pickTimeout) {
            clearInterval(timer);
            return reject(new Error('rpc invoke timeout.'));
          }
          _channel = this.pick();
          if (_channel) {
            clearInterval(timer);
            resolve();
          }
        }, 33.33);
      });
    }
    const methods = _channel.methods;
    if (!methods.includes(method)) throw new Error('cannot find the method of ' + method);
    return (await _channel.invoke(method, args)) as T;
  }
}