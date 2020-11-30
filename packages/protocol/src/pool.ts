import { EventEmitter } from 'events';
import { decodeBuffer } from './decode';
import { Request } from './request';
export class Pool extends EventEmitter {
  private readonly READ_STATIC_POOL: Buffer[] = [];
  private READ_DYNAMIC_BUFFER: Buffer = Buffer.alloc(0);
  private READ_STATUS = false;

  private readonly WRITE_SENDER: (buf: Buffer) => void;
  private readonly WRITE_STATIC_POOL: Buffer[] = [];
  private WRITE_STATUS = false;

  private readonly HEARTBEAT_TIME: number;
  private _LASTWRITE_TIMESTAMP: number = 0;
  private _LASTREAD_TIMESTAMP: number = 0;
  private HEARTBEAT_TIMER: NodeJS.Timeout;

  constructor(heartbeat: number, sender: (buf: Buffer) => void) {
    super();
    this.WRITE_SENDER = sender;
    this.HEARTBEAT_TIME = heartbeat;
    this.on('heartbeat', () => {
      const req = new Request();
      req.setEvent(Request.HEARTBEAT_EVENT);
      this.putWriteBuffer(req.value());
    });
  }

  public putReadBuffer(buf: Buffer) {
    this.READ_STATIC_POOL.push(buf);
    this._LASTREAD_TIMESTAMP = Date.now();
    if (this.READ_STATUS) return;
    this.READ_STATUS = true;
    this.readTask();
    this.READ_STATUS = false;
    return this;
  }

  private readTask() {
    const buf = this.READ_STATIC_POOL[0];
    if (buf) {
      this.READ_STATIC_POOL.splice(0, 1);
      this.READ_DYNAMIC_BUFFER = Buffer.concat([this.READ_DYNAMIC_BUFFER, buf]);
      const buffer = decodeBuffer(this.READ_DYNAMIC_BUFFER, {
        heartbeat: () => this.emit('heartbeat'),
        request: (result) => this.emit('request', result),
        response: (result) => this.emit('response', result),
      });
      this.READ_DYNAMIC_BUFFER = buffer || Buffer.alloc(0);
      this.readTask();    
    }
  }

  public putWriteBuffer(buf: Buffer) {
    this.WRITE_STATIC_POOL.push(buf);
    this._LASTWRITE_TIMESTAMP = Date.now();
    if (this.WRITE_STATUS) return;
    this.WRITE_STATUS = true;
    this.writeTask();
    this.WRITE_STATUS = false;
    return this;
  }

  private writeTask() {
    const buffer = this.WRITE_STATIC_POOL[0];
    if (buffer) {
      this.WRITE_STATIC_POOL.splice(0, 1);
      this.WRITE_SENDER(buffer);
      this.writeTask();
    }
  }

  public startHeartBeat() {
    if (this.HEARTBEAT_TIME === 0) return;
    this.HEARTBEAT_TIMER = setInterval(() => {
      const now = Date.now();
      if ((now - this._LASTREAD_TIMESTAMP > this.HEARTBEAT_TIME) || (now - this._LASTWRITE_TIMESTAMP > this.HEARTBEAT_TIME)) {
        const req = new Request();
        req.setTwoWay(true);
        req.setEvent(Request.HEARTBEAT_EVENT);
        // 发送心跳
        this.putWriteBuffer(req.value());
        this.emit('heartbeat');
      }
      if (now - this._LASTREAD_TIMESTAMP > this.HEARTBEAT_TIME * 3) {
        this.emit('heartbeat:timeout');
      }
    }, this.HEARTBEAT_TIME);
  }

  public close() {
    this._LASTREAD_TIMESTAMP = 0;
    this._LASTWRITE_TIMESTAMP = 0;
    clearInterval(this.HEARTBEAT_TIMER);
  }
}