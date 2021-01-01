import { getFinger } from "./finger";
import { Socket, createConnection } from 'net';
import { EventEmitter } from 'events';
import { Pool, TDecodeResponseSchema, Request, Attachment } from '@dubbo.ts/protocol';
import { Consumer } from "./consumer";
import { Callbacks } from './callbacks';
import { TConsumerChannel } from '@dubbo.ts/application';
import { WaitUntil } from 'wait-until-queue';

export class Channel extends EventEmitter implements TConsumerChannel {
  public count = 0;
  private tcp: Socket;
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
    this.setMaxListeners(Infinity);
    this.id = getFinger(host, port);
    this.pool = new Pool(this.consumer.application.heartbeat, buf => {
      if (this.tcp.writable) {
        this.tcp.write(buf);
      }
    });
    this.pool.on('response', (data: TDecodeResponseSchema) => this.callbacks.resolveResponse(data));
    this.pool.on('heartbeat', () => this.consumer.emit('heartbeat'));
    this.pool.on('heartbeat:timeout', () => {
      // 果断关闭
      this.close().then(() => this.consumer.emitAsync('heartbeat:timeout'));
    });
  }

  private connect() {
    const onData = (buf: Buffer) => this.pool.putReadBuffer(buf);
    const onConnectError = (err: Error) => {
      this.tcp.removeListener('error', onConnectError);
      this.close()
        .catch(e => this.consumer.application.logger.error(e))
        .finally(() => this.waitUntil.reject(err));
    };

    this.tcp = createConnection({
      host: this.host,
      port: this.port,
    });

    this.tcp.on('error', onConnectError);

    // server side disconnect.
    this.tcp.on('close', () => {
      this.tcp.removeListener('data', onData);
      this.close().catch(e => this.consumer.application.logger.error(e));
    });

    this.tcp.on('connect', () => {
      // 取消临时错误绑定
      this.tcp.removeListener('error', onConnectError);
      // 绑定数据流 传送入缓冲区 事件
      this.tcp.on('data', onData);
      this.consumer.emit('connect', this);
      this.waitUntil.resolve(this.tcp);
    });
  }

  public async close() {
    // 关闭数据缓冲区
    this.pool.close();
    // 关闭TCP连接
    this.tcp.end();
    // 触发 丢失连接 事件
    this.emit('disconnect');
    // 移除所有Channel事件
    this.removeAllListeners();
    // 通知消费者此Channel已丢失连接
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