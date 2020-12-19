import { TDecodeResponseSchema } from '@dubbo.ts/protocol';

export class Callbacks extends Map<number, [(data: any) => void, (e: Error) => void]> {
  private id = 0;

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
}