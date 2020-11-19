import { Consumer } from ".";
import { Pool } from '../protocol/pool';
import { EventEmitter } from 'events';
import { TRegistry } from "../Registry/interface";
import { Socket, createConnection } from 'net';
import { getClientFinger } from "../finger";
import { TDecodeResponseSchema } from "../protocol/decode";
import { Attachment, TAttchments } from "../protocol/attachment";
import { Request } from "../protocol/request";
export class Client<R extends TRegistry> extends EventEmitter {
  public readonly id: string;
  private readonly pool: Pool;
  private readonly connectResolvers: (() => void)[] = [];

  private tcp: Socket;
  private connectStatus = false;
  private _rpc_reconnecting = false;
  private _rpc_callback_id = 0;
  private _rpc_callbacks: Map<number, [(data: any) => void, (e: Error) => void]> = new Map();
  constructor(
    public readonly consumer: Consumer<R>,
    private readonly host: string,
    private readonly port: number
  ) {
    super();
    this.id = getClientFinger(host, port);
    this.pool = new Pool(buf => this.tcp.write(buf));
    this.pool.on('response', (data: TDecodeResponseSchema) => {
      const id = data.id;
      if (this._rpc_callbacks.has(id)) {
        const [resolve, reject] = this._rpc_callbacks.get(id);
        if (data.error) return reject(data.error);
        resolve(data.data);
      }
    });
  }

  public async connect() {
    const tcp = createConnection({ host: this.host, port: this.port });
    await new Promise((resolve, reject) => {
      const errorListener = (err: Error) => {
        tcp.removeListener('error', errorListener);
        reject(err);
      };
      tcp.on('error', errorListener);
      tcp.once('ready', () => {
        tcp.removeListener('error', errorListener);
        this.connectResolvers.forEach(resolve => resolve());
        this.connectResolvers.length = 0;
        this.connectStatus = true;
        tcp.on('data', (buf: Buffer) => this.pool.putReadBuffer(buf));
        tcp.on('end', () => {
          if (!this._rpc_reconnecting) {
            this.close();
            this.consumer.deleteClient(this);
          }
        });
        resolve();
      });
    });
    this.tcp = tcp;
  }

  public async reconnect() {
    this._rpc_reconnecting = true;
    this.close();
    await this.connect();
    this._rpc_reconnecting = false;
  }

  private wait() {
    return new Promise((resolve, reject) => {
      const resolver = () => {
        clearTimeout(timer);
        resolve();
      }
      const timer = setTimeout(() => {
        const index = this.connectResolvers.indexOf(resolver);
        if (index > -1) {
          this.connectResolvers.splice(index, 1);
        }
        reject(new Error('[rpc] client connect timeout:' + this.consumer.options.timeout + 'ms'));
      }, this.consumer.options.timeout);
      this.connectResolvers.push(resolver);
    });
  }

  public async execute(
    method: string, 
    args: any[] = [], 
    options: TAttchments
  ) {
    if (!this.connectStatus) await this.wait();
    let id = this._rpc_callback_id++;
    if (id > Number.MAX_SAFE_INTEGER) {
      this._rpc_callback_id = id = 1;
    }
    return await new Promise((resolve, reject) => {
      const req = new Request();
      const attchment = new Attachment();

      attchment.setMethodName(method);
      attchment.setParameters(args);
      
      for (const i in options) {
        if (Object.prototype.hasOwnProperty.call(options, i)) {
          const value = options[i as keyof TAttchments];
          attchment.setAttachment(i as keyof TAttchments, value);
        }
      }

      attchment.setAttachment(Attachment.DUBBO_VERSION_KEY, this.consumer.options.version);
      attchment.setAttachment(Attachment.PID_KEY, this.consumer.options.pid);
      attchment.setAttachment(Attachment.APPLICATION_KEY, this.consumer.options.application);
      attchment.setAttachment(Attachment.TIMESTAMP_KEY, Date.now());

      if (options[Attachment.INTERFACE_KEY]) {
        attchment.setAttachment(Attachment.PATH_KEY, options[Attachment.INTERFACE_KEY]);
      }

      req.setRequestId(id);
      req.setTwoWay(true);
      req.setData(attchment);

      const _resolve = (data: any) => {
        clearTimeout(timer);
        resolve(data);
      }
      const _reject = (e: Error) => {
        clearTimeout(timer);
        reject(e);
      }
      const timer = setTimeout(() => {
        if (this._rpc_callbacks.has(id)) {
          const [, __reject] = this._rpc_callbacks.get(id);
          this._rpc_callbacks.delete(id);
          __reject(new Error('[rpc] client execute timeout:' + this.consumer.options.timeout + 'ms'))
        }
      }, this.consumer.options.timeout);
      this._rpc_callbacks.set(id, [_resolve, _reject]);
      this.pool.putWriteBuffer(req.value());
    }).finally(() => {
      if (this._rpc_callbacks.has(id)) {
        this._rpc_callbacks.delete(id);
      }
    });
  }

  public async close() {
    await new Promise((resolve) => this.tcp.end(resolve));
  }
}