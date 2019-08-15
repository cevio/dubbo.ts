import * as url from 'url';
import * as net from 'net';
import Encoder from './encoder';
import Invoker from './invoker';
import { heartBeatEncode } from '../utils';
import Decoder, { DecodeType } from './decoder';
export default class Channel {
  private _uri: url.UrlWithParsedQuery;
  private _client: net.Socket;
  public active: number = 0;
  private _id: number = 1;
  private decoder: Decoder;
  public readonly app: Invoker;
  public methods: string[] = [];
  private timer: NodeJS.Timer;
  private _lastread_timestamp: number = 0;
  private _lastwrite_timestamp: number = 0;
  private callbacks: Map<number, (err: Error, data?: any, attachments?: any) => void> = new Map();
  constructor(app: Invoker, options: url.UrlWithParsedQuery) {
    this.app = app;
    this.decoder = new Decoder(this);
    this.decoder.subscribe(this.onMessage.bind(this));
    this.resolve(options);
  }

  private sendHeartbeat() {
    if (this.app.checking) return;
    this._client.write(heartBeatEncode());
    this._lastwrite_timestamp = Date.now();
  }

  resolve(options: url.UrlWithParsedQuery) {
    this._uri = options;
    this.methods = [];
    if (this._uri.query.methods) {
      this.methods.push(...(<string>this._uri.query.methods).split(','));
    }
  }

  close() {
    clearInterval(this.timer);
    this.timer = null;
    if (this._client) {
      this._client.destroy();
      delete this._client;
    }
  }

  get host() {
    return this._uri.host;
  }

  set lastread(value: number) {
    this._lastread_timestamp = value;
  }

  get lastread() {
    return this._lastread_timestamp;
  }

  get client() {
    return this._client;
  }

  onMessage(json: DecodeType) {
    const id = json.requestId;
    if (this.callbacks.has(id)) {
      const fn = this.callbacks.get(id);
      this.callbacks.delete(id);
      fn(json.err, json.res, json.attachments);
    }
  }

  async connect() {
    this._client = net.createConnection({ port: Number(this._uri.port), host: this._uri.hostname });
    await new Promise((resolve, reject) => {
      const errorListener = (err: Error) => {
        this._client.removeListener('error', errorListener);
        reject(err);
      };
      this._client.on('error', errorListener);
      this._client.once('ready', () => {
        this._client.removeListener('error', errorListener);
        resolve();
      });
    });
    this._client.on('data', buf => this.decoder.receive(buf));
    this._client.on('error', (err: Error) => this.app.app.logger.error(err));
    this._client.on('close', () => this.close());
    const heartbeat = this.app.app.heartbeat;
    const heartbeat_timeout = this.app.app.heartbeatTimeout;
    this.timer = setInterval(() => {
      const time = Date.now();
      if (
        (this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat_timeout) || 
        (this._lastwrite_timestamp > 0 && time - this._lastwrite_timestamp > heartbeat_timeout)
      ) {
        this.close();
        this.connect();
      }
      if (
        (this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat) || 
        (this._lastwrite_timestamp && time - this._lastwrite_timestamp > heartbeat)
      ) {
        this.sendHeartbeat();
      }
    }, heartbeat);
    this.sendHeartbeat();
  }

  async invoke(method: string, args: any[]) {
    if (!this._client) await this.connect();
    this.active++;
    const retries = Number(this._uri.query.retries || 2);
    return await this.retry(method, args, 1, retries).finally(() => this.active--);
  }

  async retry(method: string, args: any[], time: number, times: number) {
    const encoder = new Encoder();
    const id = this._id++;
    const json = {
      requestId: id,
      dubboVersion: this.app.app.version,
      dubboInterface: this.app.interface,
      version: this.app.version,
      methodName: method,
      methodArgs: args,
      group: this.app.group,
      timeout: Number(this._uri.query['default.timeout'] || 3000),
      application: this.app.app.application,
    }
    const buf = encoder.encode(json);
    this._client.write(buf);
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        if (time < times) return resolve(this.retry(method, args, time + 1, times));
        return reject(new Error('timeout:' + json.timeout));
      }, json.timeout);
      this.callbacks.set(id, (err: Error, data, attachments) => {
        clearTimeout(timer);
        this.callbacks.delete(id);
        if (err) return reject(err);
        resolve({ data, attachments });
      })
    });
  }
}