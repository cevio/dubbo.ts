import { EventEmitter } from 'events';
export class DubboPoolStacks<T = any> extends EventEmitter {
  private readonly buffers: Buffer[] = [];
  private readonly pools: Buffer[] = [];
  private index: number = -1;
  private decoding = false;

  constructor(private readonly decoder: (buffers: Buffer[]) => { type: 'request' | 'heart', data?: T }) {
    super();
  }

  public put(buf: Buffer) {
    this.buffers.push(buf);
    if (this.decoding) return;
    this.decoding = true;
    this.decode();
    this.decoding = false;
  }

  private decode() {
    const index = this.index + 1;
    if (this.buffers[index]) {
      this.pools.push(this.buffers[index]);
      const result = this.decoder(this.pools);
      if (result) {
        this.buffers.splice(0, index + 1);
        this.pools.length = 0;
        this.index = -1;
        this.decode();
        this.notify(result);
      } else {
        if (index < this.buffers.length) {
          this.index = index;
          this.decode();
        }
      }      
    } 
  }

  private notify(res: { type: 'request' | 'heart', data?: T }) {
    process.nextTick(() => {
      switch (res.type) {
        case 'heart': this.emit('heart'); break;
        case 'request': this.emit('data', res.data); break;
        default: throw new Error('Unknow decoding type');
      }
    });
  }

  public reset() {
    this.buffers.length = 0;
    this.pools.length = 0;
    this.index = -1;
    this.decoding = false;
  }
}