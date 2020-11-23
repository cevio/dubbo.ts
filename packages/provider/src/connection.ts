import { Socket } from 'net';
import { EventEmitter } from 'events';
import { Provider } from "./provider";
import { Pool, TDecodeRequestSchema, RESPONSE_STATUS, Response, Attachment } from '@dubbo.ts/protocol';

export type TProviderReply = ReturnType<Connection['createExecution']>;

export class Connection extends EventEmitter {
  private readonly pool: Pool;
  constructor(
    public readonly provider: Provider, 
    private readonly socket: Socket
  ) {
    super();

    this.pool = new Pool(this.provider.application.heartbeat, buf => this.socket.write(buf));
    this.socket.on('data', buf => this.pool.putReadBuffer(buf));
    this.pool.on('request', (schema: TDecodeRequestSchema) => this.provider.emit('data', this.createExecution(schema)));
    this.pool.on('heartbeat:timeout', () => this.socket.end());
    this.pool.startHeartBeat();
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
      })
        .catch(e => this.reply(RESPONSE_STATUS.SERVICE_ERROR, e.message, schema));
    }
  }

  private reply<T = any>(status: RESPONSE_STATUS, data: T, schema: TDecodeRequestSchema) {
    if (!schema.isTwoWay) return;
    const res = new Response();
    const attchment = new Attachment();
    attchment.setAttachment(Attachment.DUBBO_VERSION_KEY, this.provider.application.version);
    attchment.setAttachment(Attachment.TIMESTAMP_KEY, Date.now());
    // attchment.setAttachment(Attachment.INTERFACE_KEY, schema.interface);
    // attchment.setAttachment(Attachment.PATH_KEY, schema.interface);
    // attchment.setAttachment(Attachment.PID_KEY, this.provider.application.pid);
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