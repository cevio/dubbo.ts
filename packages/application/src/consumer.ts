import { Events } from '@dubbo.ts/utils';
import { EventEmitter } from 'events';
export type TConsumerBaseEvents = {
  stop: [],
  start: [],
  connect: [TConsumerChannel],
  disconnect: [TConsumerChannel],
}

export interface TConsumer<T extends TConsumerBaseEvents = TConsumerBaseEvents> extends Events<T> {
  connect(host: string, port: number): any;
}
export interface TConsumerChannel extends EventEmitter {
  count: number;
  execute<T = any>(name: string, method: string, args: any[], options?: {
    version?: string,
    group?: string,
  }): Promise<T>;
  close(): Promise<void>;
}