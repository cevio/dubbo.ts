import * as inject from 'reconnect-core';
import { getFinger } from "./finger";
import { Socket, createConnection, NetConnectOpts } from 'net';
import { EventEmitter } from 'events';
import { Pool, TDecodeResponseSchema, Request, Attachment } from '@dubbo.ts/protocol';
import { Consumer } from "./consumer";
import { Callbacks } from './callbacks';
import { TConsumerChannel } from '@dubbo.ts/application';
import { WaitUntil } from 'wait-until-queue';

const reconnect = inject((options: NetConnectOpts) => createConnection(options));
export class Channel extends EventEmitter implements TConsumerChannel {
  public count = 0;
  private tcp: Socket;
  private rec: inject.Instance<unknown, unknown>;
  public readonly id: string;
  private readonly pool: Pool;
  private readonly waitUntil = new WaitUntil();
  private readonly callbacks: Callbacks = new Callbacks();

  get logger() {
    return this.consumer.logger;
  }
  
  constructor(
    public readonly host: string, 
    public readonly port: number, 
    public readonly consumer: Consumer
  ) {
    super();
    this.id = getFinger(host, port);
    this.pool = new Pool(this.consumer.application.heartbeat, buf => {
      if (this.tcp.writable) {
        this.tcp.write(buf);
      }
    });
    this.pool.on('response', (data: TDecodeResponseSchema) => this.callbacks.resolveResponse(data));
    this.pool.on('heartbeat:timeout', () => {
      if (this.tcp) this.tcp.end();
      this.consumer.emitAsync('heartbeat:timeout');
    });
    this.pool.on('heartbeat', () => this.consumer.emit('heartbeat'));
  }

  private connect() {
    return new Promise<void>((resolve, reject) => {
      const rec = reconnect({
        initialDelay: 1e3,
        maxDelay: 30e3,
        strategy: 'fibonacci',
        failAfter: 20,
        randomisationFactor: 0,
        immediate: false,
      }).connect({
        host: this.host,
        port: this.port,
      })
      .on('connect', (conn: Socket) => {
        this.rec = rec;
        this.tcp = conn;
        conn.on('data', (buf: Buffer) => this.pool.putReadBuffer(buf));
        this.waitUntil.resolve(conn);
        this.consumer.emit('connect', this);
        resolve();
      })
      .on('error', err => this.logger.error(err))
      .on('reconnect', (n, delay) => {
        this.waitUntil.pause();
        this.consumer.emit('reconnect', n, delay)
      })
      .on('disconnect', err => {
        this.tcp.removeAllListeners('data');
        this.consumer.emit('disconnect', this);
      })
      .on('fail', (e) => {
        this.waitUntil.reject(e);
        return this.close().finally(() => reject(e));
      });
    });
  }

  public async close() {
    this.pool.close();
    this.rec && this.rec.disconnect();
    this.emit('disconnect');
    await this.consumer.emitAsync('disconnect', this);
  }

  public async execute<T = any>(name: string, method: string, args: any[], options: {
    version?: string,
    group?: string,
  } = {}) {
    this.count = this.count + 1;
    await this.waitUntil.wait(() => this.connect());

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