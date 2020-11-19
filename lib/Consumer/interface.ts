import { TRegistry } from "../Registry/interface";

export interface TConsumerOptions<R extends TRegistry> {
  application: string,
  pid?: number,
  registry?: R,
  timeout?: number,
  heartbeat?: number,
  version: string,
}

export interface TConsumerConnectOptions {
  group?: string,
  version?: string,
}

export type TConsumerEncodeBody = {
  path?: string,
  requestId: number,
  dubboVersion: string,
  dubboInterface: string,
  version: string,
  methodName: string,
  methodArgs?: any[],
  group?: string,
  timeout?: number,
  application: string,
  attachments?: {
    [name: string]: any,
  }
}