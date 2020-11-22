import { UrlWithParsedQuery } from 'url';
export interface TRegistry {
  onProviderPublish(): Promise<void>;
  onProviderUnPublish(): Promise<void>;
  onConsumerRegister(name: string, options: { group?: string, version?: string }): Promise<string>;
  onConsumerUnRegister(url: string): Promise<void>;
  onConsumerQuery(name: string, options: { group?: string, version?: string }): Promise<UrlWithParsedQuery[]>;
}