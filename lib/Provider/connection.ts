import { Socket } from 'net';
import { Provider } from '.';
import { Pool } from '../protocol/pool';
import { EventEmitter } from 'events';
import { TRegistry } from '../Registry/interface';
import { TDecodeRequestSchema } from "../protocol/decode";
import { RESPONSE_STATUS } from '../protocol/utils';
import { Response } from '../protocol/response';
import { Attachment, TAttchments } from '../protocol/attachment';
export class Connection<R extends TRegistry = any> extends EventEmitter {
  private readonly pool: Pool;
  constructor(
    public readonly provider: Provider<R>, 
    private readonly socket: Socket
  ) {
    super();
    this.pool = new Pool(buf => this.socket.write(buf));
    this.socket.on('close', () => {
      this.close().then(() => this.provider.deleteConnection(this));
    });
    this.socket.on('data', buf => this.pool.putReadBuffer(buf));
    this.pool.on('request', (schema: TDecodeRequestSchema) => this.provider.emit('data', schema, this));
  }

  public execute<T = any>(
    schema: TDecodeRequestSchema, 
    callback: (status: typeof RESPONSE_STATUS) => Promise<{
      status: RESPONSE_STATUS,
      data?: T
    }>
  ) {
    const result = Promise.resolve(callback(RESPONSE_STATUS));
    result.then(({ status, data }) => this.reply(status, data, schema))
      .catch(e => this.reply(RESPONSE_STATUS.SERVICE_ERROR, e.message, schema));
  }

  private reply<T = any>(status: RESPONSE_STATUS, data: T, schema: TDecodeRequestSchema) {
    if (!schema.isTwoWay) return;

    const res = new Response();
    const attchment = new Attachment();

    if (schema.attachments) {
      for (const i in schema.attachments) {
        if (Object.prototype.hasOwnProperty.call(schema.attachments, i)) {
          attchment.setAttachment(i as keyof TAttchments, schema.attachments[i]);
        }
      }
    }
  
    attchment.setAttachment(Attachment.DUBBO_VERSION_KEY, this.provider.options.version);
    attchment.setAttachment(Attachment.VERSION_KEY, schema.version);
    attchment.setAttachment(Attachment.PID_KEY, this.provider.options.pid);
    attchment.setAttachment(Attachment.INTERFACE_KEY, schema.interface);
    attchment.setAttachment(Attachment.APPLICATION_KEY, this.provider.options.application);
    attchment.setAttachment(Attachment.TIMESTAMP_KEY, Date.now());

    if (schema.attachments[Attachment.INTERFACE_KEY]) {
      attchment.setAttachment(Attachment.PATH_KEY, schema.attachments[Attachment.INTERFACE_KEY]);
    }

    res.setRequestId(schema.id);
    res.setStatusCode(status);
    res.setData(attchment, data);
    return this.pool.putWriteBuffer(res.value());
  }

  public async close() {
    await new Promise(resolve => this.socket.end(resolve));
  }
}