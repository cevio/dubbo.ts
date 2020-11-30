import { UrlWithParsedQuery } from 'url';
import { Events } from '@dubbo.ts/utils';
import { TConsumerChannel } from './consumer';
// export interface TRegistry {
//   onProviderPublish(): Promise<void>;
//   onProviderUnPublish(): Promise<void>;
//   onConsumerRegister(name: string, options: { group?: string, version?: string }): Promise<string>;
//   onConsumerUnRegister(url: string): Promise<void>;
//   onConsumerQuery(name: string, options: { group?: string, version?: string }): Promise<UrlWithParsedQuery[]>;
//   onConsumerConnect(): Promise<void>;
//   onConsumerDisconnect(): Promise<void>;
//   addService(name: string, methods: string[], options: { group?: string, version?: string }): any;
//   create(url: string): Promise<void>;
//   remove(uri: string): Promise<void>;
//   query(path: string): Promise<string[]>;
// }

export type TRegistryBaseEvents = {
  start: [],
  stop: [],
};

export interface TRegistry<T extends TRegistryBaseEvents = TRegistryBaseEvents> extends Events<T> {
  addProviderService(name: string, methods: string[], options: { group?: string, version?: string }): this;
  invoke(name: string, options: { group?: string, version?: string }): Promise<TConsumerChannel>;
  create(url: string): Promise<void>;
  remove(uri: string): Promise<void>;
  query(path: string): Promise<string[]>;
}