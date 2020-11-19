import { TServiceOptions } from "./Provider/interface";

interface fingerOptions {
  interface: string,
  group?: string,
  version?: string,
}

export function getServiceFinger(options: fingerOptions) {
  return `Service:${options.interface}#${options.group || 'default'}@${options.version || '0.0.0'}`;
}

export function getClientFinger(host: string, port: number) {
  return `Client:${host}:${port}`;
}