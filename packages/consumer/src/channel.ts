import { getFinger } from "./finger";
import { Socket, createConnection } from 'net';
import { EventEmitter } from 'events';
import { Pool, TDecodeResponseSchema } from '@dubbo.ts/protocol';
import { Consumer } from "./consumer";
import { Callbacks } from './callbacks';
import { Request, Attachment } from '@dubbo.ts/protocol';

const Retry = require('promise-retry');

export class Channel extends EventEmitter {
  private tcp: Socket;
  public readonly id: string;
  private readonly pool: Pool;
  private readonly callbacks = new Callbacks(this);
  private RECONNECTING = false;
  constructor(
    private readonly host: string, 
    private readonly port: number, 
    public readonly consumer: Consumer
  ) {
    super();
    this.id = getFinger(host, port);
    this.pool = new Pool(this.consumer.application.heartbeat, buf => this.tcp.write(buf));
    this.pool.on('response', (data: TDecodeResponseSchema) => this.callbacks.resolveResponse(data));
    this.pool.on('heartbeat:timeout', () => this.reconnect());
  }

  public async reconnect() {
    this.RECONNECTING = true;
    await this.close();
    await this.retryConnect();
    this.RECONNECTING = false;
  }

  private async retryConnect() {
    await this.callbacks.wait(() => Retry((retry: any) => this.connect().catch(retry), {
      retries: this.consumer.application.retries,
      minTimeout: this.consumer.application.timeout,
    }));
  }

  private async connect() {
    const tcp = createConnection({ host: this.host, port: this.port });
    await new Promise<void>((resolve, reject) => {
      const errorListener = (err: Error) => {
        tcp.removeListener('error', errorListener);
        reject(err);
      };
      tcp.on('error', errorListener);
      tcp.once('ready', () => {
        tcp.removeListener('error', errorListener);
        tcp.on('data', (buf: Buffer) => this.pool.putReadBuffer(buf));
        tcp.on('error', e => this.consumer.emit('error', e));
        tcp.on('end', () => {
          if (!this.RECONNECTING) {
            this.close(true).then(() => this.consumer.deleteChannel(this))
          }
        });
        this.pool.startHeartBeat();
        this.consumer.emit('connect', this);
        resolve();
      });
    });
    this.tcp = tcp;
  }

  public async execute(name: string, method: string, args: any[], options: {
    version?: string,
    group?: string,
  } = {}) {
    await this.retryConnect();

    const version = options.version || '*';
    const group = options.group || '*';
    const id = this.callbacks.createIndex();

    return await new Promise((resolve, reject) => {
      const req = new Request();
      const attchment = new Attachment();
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
      this.callbacks.createRequestTask(id, resolve, reject, this.consumer.application.timeout);
      this.pool.putWriteBuffer(req.value());
    })
  }

  public async close(passive?: boolean) {
    this.pool.close();
    !passive && await new Promise<void>((resolve) => this.tcp.end(resolve));
    this.emit('disconnect');
    this.consumer.emit('disconnect', this);
  }
}