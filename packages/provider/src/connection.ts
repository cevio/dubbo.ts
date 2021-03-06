import { Socket } from 'net';
import { Provider } from "./provider";
import { Pool, TDecodeRequestSchema, RESPONSE_STATUS, Response, Attachment } from '@dubbo.ts/protocol';

export type TProviderReply = ReturnType<Connection['createExecution']>;

export class Connection {
  private readonly pool: Pool;
  constructor(
    public readonly provider: Provider, 
    private readonly socket: Socket
  ) {
    this.pool = new Pool(this.provider.application.heartbeat, buf => {
      /**
       * 防止产生write after end的错误
       * 一般的，如果连接丢失，池里面可能还存在队列
       * 这个时候应该不能发送数据
       */
      if (this.socket.writable) {
        this.socket.write(buf);
      }
    });
    this.socket.on('data', buf => this.pool.putReadBuffer(buf));
    this.pool.on('request', (schema: TDecodeRequestSchema) => this.provider.emit('data', this.createExecution(schema)));
    this.pool.on('heartbeat:timeout', () => this.provider.emitAsync('heartbeat:timeout').then(() => this.socket.end()));
    this.pool.on('heartbeat', () => this.provider.emit('heartbeat'));
    this.pool.open();
  }

  public createExecution(schema: TDecodeRequestSchema) {
    return <T = any>(callback: (schema: TDecodeRequestSchema, status: typeof RESPONSE_STATUS) => Promise<{
      status: RESPONSE_STATUS,
      data?: T
    }>) => {
      const result = Promise.resolve(callback(schema, RESPONSE_STATUS));
      result.then((result) => {
        if (schema.isTwoWay) {
          return this.reply(result.status, result.data, schema);
        }
      }).catch(e => this.reply(RESPONSE_STATUS.SERVICE_ERROR, e.message, schema));
    }
  }

  private reply<T = any>(status: RESPONSE_STATUS, data: T, schema: TDecodeRequestSchema) {
    if (!schema.isTwoWay) return;
    const res = new Response();
    const attchment = new Attachment();
    attchment.setAttachment(Attachment.DUBBO_VERSION_KEY, this.provider.application.version);
    attchment.setAttachment(Attachment.TIMESTAMP_KEY, Date.now());
    res.setRequestId(schema.id);
    res.setStatusCode(status);
    res.setData(attchment, data);
    return this.pool.putWriteBuffer(res.value());
  }

  async close(passive?: boolean) {
    this.pool.close();
    !passive && await new Promise<void>((resolve, reject) => {
      this.socket.end((err?: Error) => {
        if (err) return reject(err);
        resolve();
      })
    });
  }
}