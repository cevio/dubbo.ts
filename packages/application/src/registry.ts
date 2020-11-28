import { UrlWithParsedQuery } from 'url';
export interface TRegistry {
  onProviderPublish(): Promise<void>;
  onProviderUnPublish(): Promise<void>;
  onConsumerRegister(name: string, options: { group?: string, version?: string }): Promise<string>;
  onConsumerUnRegister(url: string): Promise<void>;
  onConsumerQuery(name: string, options: { group?: string, version?: string }): Promise<UrlWithParsedQuery[]>;
  onConsumerConnect(): Promise<void>;
  onConsumerDisconnect(): Promise<void>;
  addService(name: string, methods: string[], options: { group?: string, version?: string }): any;
  create(url: string): Promise<void>;
  remove(uri: string): Promise<void>;
  query(path: string): Promise<string[]>;
}