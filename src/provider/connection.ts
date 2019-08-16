import * as net from 'net';
import Provider from './index';
import Decoder, { DecodeType } from './decoder';
import { EventEmitter } from '@nelts/utils';
import Context, { ContextError } from './context';
import Encoder from './encoder';
import { PROVIDER_CONTEXT_STATUS, heartBeatEncode } from '../utils';
interface SocketError extends Error {
  code?: number | string
}
export default class Connection extends EventEmitter {
  private app: Provider;
  public socket: net.Socket;
  private timer: NodeJS.Timer;
  private _lastread_timestamp: number = 0;
  private _lastwrite_timestamp: number = 0;
  constructor(app: Provider, socket: net.Socket) {
    super();
    this.app = app;
    this.socket = socket;
    const heartbeat = this.app.heartbeat;
    const heartbeat_timeout = this.app.heartbeatTimeout;
    const decoder = new Decoder(this);
    decoder.subscribe(this.onMessage.bind(this));
    socket.on('data', (data: Buffer) => {
      this.updateRead();
      decoder.receive(data);
    });
    socket.on('close', () => this.app.sync('drop', this));
    socket.on('error', (err: SocketError) => this.app.logger.error(err));
    this.timer = setInterval(() => {
      const time = Date.now();
      if (
        (this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat_timeout) || 
        (this._lastwrite_timestamp > 0 && time - this._lastwrite_timestamp > heartbeat_timeout)
      ) {
        return this.app.sync('drop', this);
      }
      if (
        (this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat) || 
        (this._lastwrite_timestamp && time - this._lastwrite_timestamp > heartbeat)
      ) {
        this.sendHeartbeat();
      }
    }, heartbeat);
  }

  set lastread(value: number) {
    this._lastread_timestamp = value;
  }

  get lastread() {
    return this._lastread_timestamp;
  }

  get lastwrite() {
    return this._lastwrite_timestamp;
  }

  set lastwrite(value: number) {
    this._lastwrite_timestamp = value;
  }

  updateWrite() {
    this.lastwrite = Date.now();
  }

  updateRead() {
    this.lastread = Date.now();
  }

  private sendHeartbeat() {
    this.socket.write(heartBeatEncode());
    this._lastwrite_timestamp = Date.now();
  }

  async destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.socket.destroy();
  }

  private onMessage(json: DecodeType) {
    // console.log('json', json)
    const ctx = new Context(this, json);
    const encoder = new Encoder(ctx);
    // if (this.app.version !== ctx.dubboVersion) return this.replyError(encoder, ctx.error('unsupport dubbo version:' + json.dubboVersion, PROVIDER_CONTEXT_STATUS.BAD_REQUEST));
    const group = ctx.group;
    const interacename = ctx.interfaceName;
    const interfaceversion = ctx.interfaceVersion;
    const services = this.app.services;
    if (!services[group]) return this.replyError(encoder, ctx.error('cannot find the group:' + group, PROVIDER_CONTEXT_STATUS.SERVICE_NOT_FOUND)); 
    if (!services[group][interacename]) return this.replyError(encoder, ctx.error('cannot find the interface name:' + interacename, PROVIDER_CONTEXT_STATUS.SERVICE_NOT_FOUND)); 
    if (!services[group][interacename][interfaceversion]) return this.replyError(encoder, ctx.error('cannot find the interface version:' + interfaceversion, PROVIDER_CONTEXT_STATUS.SERVICE_NOT_FOUND));
    ctx.interface = services[group][interacename][interfaceversion];
    if (!ctx.interface.serviceMethods.includes(ctx.method)) return this.replyError(encoder, ctx.error('cannot find the interface version:' + interfaceversion, PROVIDER_CONTEXT_STATUS.SERVER_TIMEOUT));
    Promise.resolve(this.sync('packet', ctx))
    .then(() => {
      if (!ctx.status) ctx.status = PROVIDER_CONTEXT_STATUS.OK;
      this.socket.write(encoder.encode());
      this.updateWrite();
    })
    .catch((e: ContextError) => {
      if (!e.code || !e.ctx) e = ctx.error(e.message, e.code || PROVIDER_CONTEXT_STATUS.SERVICE_ERROR);
      this.replyError(encoder, e);
    });
  }

  private replyError(encoder: Encoder, err: ContextError) {
    err.ctx.status = err.code;
    err.ctx.body = err.message;
    this.socket.write(encoder.encode());
    this.updateWrite();
  }
}