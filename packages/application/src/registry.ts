export interface TRegistry {
  connect(): Promise<unknown>;
  close(): Promise<unknown>;
  create(uri: string): Promise<void>;
  remove(uri: string): Promise<void>;
  query(path: string): Promise<string[]>;
}