import { TRegistry } from "../Registry/interface";

export interface TConsumerOptions<R extends TRegistry> {
  application: string,
  pid?: number,
  registry?: R,
  timeout?: number,
  heartbeat?: number,
  version: string,
}