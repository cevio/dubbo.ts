import * as net from 'net';
import Provider from './index';
import Decoder, { DecodeType } from './decoder';
import { EventEmitter } from '@nelts/utils';
import Context, { ContextError } from './context';
import Encoder from './encoder';
import { PROVIDER_CONTEXT_STATUS } from '../utils';
export default class Connection extends EventEmitter {
  private app: Provider;
  private socket: net.Socket;
  constructor(app: Provider, socket: net.Socket) {
    super();
    this.app = app;
    this.socket = socket;
    const decoder = new Decoder();
    decoder.subscribe(this.onMessage.bind(this));
    socket.on('data', (data: Buffer) => decoder.receive(data));
  }

  private onMessage(json: DecodeType) {
    const ctx = new Context(this, json);
    const encoder = new Encoder(ctx);
    if (this.app.version !== ctx.dubboVersion) return this.replyError(encoder, ctx.error('unsupport dubbo version:' + json.dubboVersion, PROVIDER_CONTEXT_STATUS.BAD_REQUEST));
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
  }
}