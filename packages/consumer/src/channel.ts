import { getFinger } from "./finger";
import { Socket, createConnection } from 'net';
import { EventEmitter } from 'events';
import { Pool, TDecodeResponseSchema, Request, Attachment } from '@dubbo.ts/protocol';
import { Consumer } from "./consumer";
import { Callbacks } from './callbacks';
import { TConsumerChannel } from '@dubbo.ts/application';

const Retry = require('promise-retry');

export class Channel extends EventEmitter implements TConsumerChannel {
  private tcp: Socket;
  public readonly id: string;
  private readonly pool: Pool;
  private callbacks: Callbacks = new Callbacks(this);
  private RECONNECTING = false;
  public count = 0;
  constructor(
    public readonly host: string, 
    public readonly port: number, 
    public readonly consumer: Consumer
  ) {
    super();
    this.id = getFinger(host, port);
    this.pool = new Pool(this.consumer.application.heartbeat, buf => this.tcp.write(buf));
    this.pool.on('response', (data: TDecodeResponseSchema) => this.callbacks.resolveResponse(data));
    this.pool.on('heartbeat:timeout', () => this.consumer.emitAsync('heartbeat:timeout').then(() => this.reconnect()));
    this.pool.on('heartbeat', () => this.consumer.emit('heartbeat'));
  }

  private async reconnect() {
    this.RECONNECTING = true;
    await this.close();
    await this.retryConnect(true);
    this.RECONNECTING = false;
  }

  private retryConnect(isReconnect?: boolean) {
    isReconnect && this.callbacks.reset();
    return this.callbacks.wait(() => Retry((retry: any, number: number) => {
      isReconnect && this.consumer.emit('reconnect', number, this);
      return this.connect().catch(retry);
    }, {
      retries: 20,
      minTimeout: 3000,
      maxTimeout: 10000,
    }));
  }

  private async connect() {
    await new Promise<void>((resolve, reject) => {
      const tcp = this.tcp = createConnection({ host: this.host, port: this.port });
      const errorListener = (err: Error) => {
        tcp.removeListener('error', errorListener);
        reject(err);
      };
      tcp.setNoDelay();
      tcp.on('error', errorListener);
      tcp.once('ready', () => {
        tcp.removeListener('error', errorListener);
        tcp.on('data', (buf: Buffer) => this.pool.putReadBuffer(buf));
        tcp.on('error', e => this.consumer.emit('error', e));
        tcp.on('close', () => {
          if (!this.RECONNECTING) {
            this.retryConnect(true).catch(e => {
              this.close(true)
              .then(() => this.consumer.deleteChannel(this))
              .catch(e => this.consumer.emitAsync('error', e));
            });
          }
        });
        this.pool.open();
        resolve();
      });
    });
    await this.consumer.emitAsync('connect', this);
  }

  public async close(passive?: boolean) {
    this.pool.close();
    try{
      !passive && await new Promise<void>((resolve) => this.tcp.end(resolve));
    } catch(e) {}
    this.emit('disconnect');
    await this.consumer.emitAsync('disconnect', this);
  }

  public async execute<T = any>(name: string, method: string, args: any[], options: {
    version?: string,
    group?: string,
  } = {}) {
    this.count = this.count + 1;
    await this.retryConnect();

    const version = options.version || '0.0.0';
    const group = options.group || '*';
    const id = this.callbacks.createIndex();

    return await new Promise<T>((resolve, reject) => {
      const req = new Request();
      const attchment = new Attachment();
      const _resolve = (data: T) => {
        this.count = this.count - 1;
        resolve(data);
      };
      const _reject = (e: any) => {
        this.count = this.count - 1;
        reject(e);
      };
      attchment.setMethodName(method);
      attchment.setParameters(args);
      attchment.setAttachment(Attachment.GROUP_KEY, group);
      attchment.setAttachment(Attachment.VERSION_KEY, version);
      attchment.setAttachment(Attachment.DUBBO_VERSION_KEY, this.consumer.application.version);
      attchment.setAttachment(Attachment.PATH_KEY, name);
      attchment.setAttachment(Attachment.TIMESTAMP_KEY, Date.now());
      req.setRequestId(id);
      req.setTwoWay(true);
      req.setData(attchment);
      this.callbacks.createRequestTask(id, _resolve, _reject, this.consumer.application.timeout);
      this.pool.putWriteBuffer(req.value());
    })
  }
  
}