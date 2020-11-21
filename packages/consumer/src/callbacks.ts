import { TDecodeResponseSchema } from '@dubbo.ts/protocol';
import { Channel } from './channel';
export class Callbacks extends Map<number, [(data: any) => void, (e: Error) => void]> {
  private id = 0;
  private connectCode: 0 | 1 | 2 | 3 = 0;
  private readonly waits: Set<{
    resolve: () => void,
    reject: (e: Error) => void,
  }> = new Set();

  constructor(private readonly channel: Channel) {
    super();
  }

  public createRequestTask<T = any>(
    id: number, 
    resolve: (data: T) => void, 
    reject: (e: Error) => void, 
    timeout: number
  ) {
    const _resolve = (data: T) => {
      clearTimeout(timer);
      if (this.has(id)) this.delete(id);
      resolve(data);
    }
    const _reject = (e: Error) => {
      clearTimeout(timer);
      if (this.has(id)) this.delete(id);
      reject(e);
    }
    const operations = [_resolve, _reject];
    const timer = setTimeout(() => {
      if (this.has(id)) this.delete(id);
      reject(new Error('[rpc] client execute timeout:' + timeout + 'ms'))
    }, timeout);
    this.set(id, operations as [(data: any) => void, (e: Error) => void]);
  }

  public createIndex() {
    let id = this.id + 1;
    if (id > Number.MAX_SAFE_INTEGER) {
      id = 0;
    }
    this.id = id;
    return id;
  }

  public resolveResponse(data: TDecodeResponseSchema) {
    const id = data.id;
    if (this.has(id)) {
      const [resolve, reject] = this.get(id);
      if (data.error) return reject(data.error);
      resolve(data.data);
    }
  }

  private deleteOperation(operation: {
    resolve: () => void,
    reject: (e: Error) => void,
  }) {
    if (this.waits.has(operation)) {
      this.waits.delete(operation);
    }
  }

  public async wait(callback: () => Promise<void>) {
    switch (this.connectCode) {
      case 0:
        this.connectCode = 1;
        await callback().then(() => {
          this.connectCode = 2;
          for (const { resolve } of this.waits) resolve();
        }).catch(e => {
          this.connectCode = 3;
          for (const { reject } of this.waits) reject(e);
          return Promise.reject(e);
        });
        break;
      case 1:
        await new Promise<void>((resolve, reject) => {
          const resolver = () => {
            clearTimeout(timer);
            this.deleteOperation(operation);
            resolve();
          }
          const rejecter = (e: Error) => {
            clearTimeout(timer);
            this.deleteOperation(operation);
            reject(e);
          }
          const operation = {
            resolve: resolver,
            reject: rejecter,
          }
          const timer = setTimeout(() => {
            this.deleteOperation(operation);
            reject(new Error('[rpc] client connect timeout:' + this.channel.consumer.application.timeout + 'ms'));
          }, this.channel.consumer.application.timeout);
          this.waits.add(operation);
        });
        break;
      case 3: throw new Error('[rpc] client connect failed');
    }
  }
}