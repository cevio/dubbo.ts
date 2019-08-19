import * as url from 'url';
import * as net from 'net';
import Invoker from './invoker';
import encode from './encode';
import { heartBeatEncode, RPC_CALLBACK_ARGS, RPC_CALLBACK } from '../utils';
import decode from './decode';

export default class Channel {
  public readonly invoker: Invoker;
  private client: net.Socket;
  private service: url.UrlWithParsedQuery;
  public alive: boolean;
  public busies: number = 0;
  private _lastread_timestamp: number = Date.now();
  private _lastwrite_timestamp: number = Date.now();
  private _heartbeat_timer: NodeJS.Timer;
  private _rpc_callback_id = 0;
  private _rpc_callbacks: Map<number, RPC_CALLBACK> = new Map();
  constructor(invoker: Invoker) {
    this.invoker = invoker;
  }

  get href() {
    return this.service.href;
  }

  get retries() {
    return Number(this.service.query['default.retries'] as string);
  }

  get timeout() {
    return Number(this.service.query['default.timeout'] as string);
  }

  invoke(method: string, args: any[]): PromiseLike<RPC_CALLBACK_ARGS> {
    if (!this.service.query.methods || !(<string>this.service.query.methods).split(',').includes(method)) {
      return Promise.resolve({
        code: 444,
        message: 'cannot find the method of ' + method,
      });
    }
    this.busies++;
    let id = this._rpc_callback_id++;
    if (id === Number.MAX_SAFE_INTEGER) id = 1;
    this.invoker.consumer.logger.debug('[Consumer Invoker]', this.service.host);
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this._rpc_callbacks.delete(id);
        this.busies--;
        resolve({
          code: 408,
          message: 'rpc invoke timeout:' + this.timeout,
        });
      }, this.timeout);
      this._rpc_callbacks.set(id, data => {
        clearTimeout(timer);
        this._rpc_callbacks.delete(id);
        this.busies--;
        resolve(data);
      });
      this.send(encode({
        requestId: id,
        dubboVersion: this.service.query.dubbo as string,
        dubboInterface: this.service.query.interface as string,
        version: this.service.query.version as string,
        methodName: method,
        methodArgs: args,
        group: this.service.query['default.group'] as string,
        timeout: Number(this.service.query['default.timeout'] as string || 0),
        application: this.invoker.consumer.application,
      }))
    })
  }

  send(buf: Buffer) {
    if (!this.alive) return;
    this.client.write(buf);
    this._lastwrite_timestamp = Date.now();
  }

  async reconnect() {
    await this.connect();
    this.bindEvents();
    this.setupHeartbeat();
    this.alive = true;
  }

  private async connect() {
    this.client = net.createConnection({ port: Number(this.service.port), host: this.service.hostname });
    await new Promise((resolve, reject) => {
      const errorListener = (err: Error) => {
        this.client.removeListener('error', errorListener);
        reject(err);
      };
      this.client.on('error', errorListener);
      this.client.once('ready', () => {
        this.client.removeListener('error', errorListener);
        resolve();
      });
    });
  }

  private bindEvents() {
    this.client.on('data', (buf: Buffer) => this.onMessage(buf));
    this.client.on('error', err => this.invoker.consumer.logger.fatal(err));
    this.client.on('close', () => {
      this.invoker.consumer.logger.debug('  %', this.href);
      return this.uninstall();
    });
  }

  private setupHeartbeat() {
    const heartbeat = Number(this.service.query.heartbeat || 0);
    const heartbeat_timeout = heartbeat * 3;
    if (heartbeat > 0) {
      this._heartbeat_timer = setInterval(() => {
        const time = Date.now();
        const readTime = time - this._lastread_timestamp;
        const writeTime = time - this._lastwrite_timestamp;
        if (readTime > heartbeat_timeout || writeTime > heartbeat_timeout) {
          return (async () => {
            await this.uninstall();
            await this.install(this.service);
          })().catch(e => {
            this.invoker.consumer.logger.fatal(e);
            return this.uninstall();
          });
        }
        if (readTime > heartbeat || writeTime > heartbeat) return this.send(heartBeatEncode());
      }, heartbeat);
    }
  }

  onMessage(buf: Buffer) {
    this._lastread_timestamp = Date.now();
    decode(this, buf, ({ err, res, requestId, attachments, }) => {
      const fn = this._rpc_callbacks.has(requestId) ? this._rpc_callbacks.get(requestId) : null;
      if (fn) {
        if (err) return fn({
          code: 500,
          message: err.message,
        });
        return fn({
          code: 200, 
          data: res,
        });
      }
    });
  }

  private close() {
    if (!this.alive) return;
    clearInterval(this._heartbeat_timer);
    this._heartbeat_timer = null;
    this.client.destroy();
  }

  async install(one: url.UrlWithParsedQuery) {
    this.setup(one);
    await this.reconnect();
  }

  async uninstall() {
    this.close();
    this.alive = false;
  }

  async setup(one: url.UrlWithParsedQuery) {
    this.service = one;
  }
}