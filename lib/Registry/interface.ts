export interface TRegistryOptions {
  host?: string,
  sessionTimeout?: number,
  spinDelay?: number,
  retries?: number,
  dubboRootName?: string,
  dubboVersion?: string,
}

export interface TRegistry {
  readonly options: TRegistryOptions,
  connect(): Promise<unknown>;
  close(): Promise<unknown>;
  exists(url: string): Promise<boolean>;
  create(uri: string): Promise<void>;
  remove(uri: string): Promise<void>;
}