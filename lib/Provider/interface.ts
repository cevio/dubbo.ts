import { TRegistry } from "../Registry/interface";

export interface TProviderOptions<R extends TRegistry> {
  registry?: R;
  application: string,
  pid?: number,
  heartbeat?: number,
  port: number,
  version: string,
}

export interface TServiceOptions {
  interface: string,
  revision?: string,
  version?: string,
  group?: string,
  methods: string[],
  delay?: number,
  retries?: number,
  timeout?: number,
}