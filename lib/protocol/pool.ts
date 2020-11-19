import { EventEmitter } from 'events';
import { decodeBuffer } from './decode';
export class Pool extends EventEmitter {
  private readonly READ_STATIC_POOL: Buffer[] = [];
  private READ_DYNAMIC_BUFFER: Buffer = Buffer.alloc(0);
  private READ_STATUS = false;

  private readonly WRITE_SENDER: (buf: Buffer) => void;
  private readonly WRITE_STATIC_POOL: Buffer[] = [];
  private WRITE_STATUS = false;

  constructor(sender: (buf: Buffer) => void) {
    super();
    this.WRITE_SENDER = sender;
  }

  public putReadBuffer(buf: Buffer) {
    this.READ_STATIC_POOL.push(buf);
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
}