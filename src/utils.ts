import Registry from './registry';
import * as os from 'os';

export const DUBBO_HEADER_LENGTH = 16;
export const DUBBO_MAGIC_HEADER = 0xdabb;
export const FLAG_REQEUST = 0x80;
export const FLAG_TWOWAY = 0x40;
export const FLAG_EVENT = 0x20;
export const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;
export const MAGIC_HIGH = 0xda;
export const MAGIC_LOW = 0xbb;
export const DUBBO_DEFAULT_PAY_LOAD = 8 * 1024 * 1024;

export type RPC_CALLBACK_ARGS = { code: number, data?: any, message?: string };
export type RPC_CALLBACK = (result: RPC_CALLBACK_ARGS) => void;

export type ConsumerEncodeBody = {
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

export type RegistryInitOptions = {
  host: string,
  sessionTimeout?: number,
  spinDelay?: number,
  retries?: number,
  connectTimeout?: number,
}

export enum CREATE_MODES {
  PERSISTENT = 0,
  PERSISTENT_SEQUENTIAL = 2,
  EPHEMERAL = 1,
  EPHEMERAL_SEQUENTIAL = 3,
}

const interfaces = os.networkInterfaces();
export const localhost = Object.keys(interfaces).map(function(nic) {
  const addresses = interfaces[nic].filter(details => details.family.toLowerCase() === "ipv4" && !isLoopback(details.address));
  return addresses.length ? addresses[0].address : undefined;
}).filter(Boolean)[0];

export type Logger = {
  trace?(...args: any[]): void;
  debug?(...args: any[]): void;
  error(...args: any[]): void;
  info(...args: any[]): void;
  log(...args: any[]): void;
  fatal?(...args: any[]): void;
  warn(...args: any[]): void;
}

export type ProviderServiceChunkInitOptions = {
  interface: string,
  revision?: string,
  version?: string,
  group?: string,
  methods: string[],
  delay?: number,
  retries?: number,
  timeout?: number,
}

export type ConsumerServiceInitOptions = {
  application: string,
  root?: string,
  dubbo_version: string,
  pid: number,
  registry?: Registry,
  logger?: Logger,
  pickTimeout?: number,
}

export type ProviderInitOptions = {
  application: string,
  root?: string,
  dubbo_version: string,
  port: number,
  pid: number,
  registry: Registry,
  heartbeat?: number,
  logger?: Logger,
}

export function getProviderServiceChunkId(interfacename: string, interfacegroup: string, interfaceversion: string) {
  return `Service:${interfacename}#${interfacegroup}@${interfaceversion}`;
}

function isLoopback(addr: string) {
  return (
    /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(addr) ||
    /^fe80::1$/.test(addr) ||
    /^::1$/.test(addr) ||
    /^::$/.test(addr)
  );
}

export function heartBeatEncode(isReply?: boolean) {
  const buffer = Buffer.alloc(DUBBO_HEADER_LENGTH + 1);
  buffer[0] = DUBBO_MAGIC_HEADER >>> 8;
  buffer[1] = DUBBO_MAGIC_HEADER & 0xff;
  buffer[2] = isReply 
    ? HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_EVENT
    : FLAG_REQEUST | HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_TWOWAY | FLAG_EVENT;
  buffer[15] = 1;
  buffer[16] = 0x4e;
  return buffer;
}


export function toBytes4(num: number) {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(num, 0);
  return buf;
}

export function fromBytes4(buf: Buffer) {
  return buf.readUInt32BE(0);
}

export function toBytes8(num: number) {
  const buf = Buffer.allocUnsafe(8);
  const high = Math.floor(num / 4294967296);
  const low = (num & 0xffffffff) >>> 0;
  buf.writeUInt32BE(high, 0);
  buf.writeUInt32BE(low, 4);
  return buf;
}

export function fromBytes8(buf: Buffer) {
  const high = buf.readUInt32BE(0);
  const low = buf.readUInt32BE(4);
  return high * 4294967296 + low;
}

export function isHeartBeat(buf: Buffer) {
  const flag = buf[2];
  return (flag & FLAG_EVENT) !== 0;
}

export function isReplyHeart(buf: Buffer) {
  const flag = buf[2];
  return (flag & 0xE0) === 224;
}

export function getDubboArgumentLength(str: string) {
  return getDubboArrayArgumentLength(str, 0);
}

function getDubboArrayArgumentLength(str: string, i: number) {
  const dot = str.charAt(0);
  switch (dot) {
    case '[': return getDubboNormalizeArgumentLength(str.substring(1), i);
    default: return getDubboNormalizeArgumentLength(str, i);
  }
}

function getDubboNormalizeArgumentLength(str: string, i: number): number {
  if (!str) return i;
  const dot = str.charAt(0);
  switch (dot) {
    case 'L':
      const j = str.indexOf(';');
      if (j > -1) return getDubboArrayArgumentLength(str.substring(j + 1), i + 1);
      return i;
    default: return getDubboArrayArgumentLength(str.substring(1), i + 1);
  }
}

export enum PROVIDER_CONTEXT_STATUS {
  OK = 20,
  CLIENT_TIMEOUT = 30,
  SERVER_TIMEOUT = 31,
  BAD_REQUEST = 40,
  BAD_RESPONSE = 50,
  SERVICE_NOT_FOUND = 60,
  SERVICE_ERROR = 70,
  SERVER_ERROR = 80,
  CLIENT_ERROR = 90,
  SERVER_THREADPOOL_EXHAUSTED = 100,
}

export enum PROVIDER_RESPONSE_BODY_FLAG {
  RESPONSE_WITH_EXCEPTION = 0,
  RESPONSE_VALUE = 1,
  RESPONSE_NULL_VALUE = 2,
  RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS = 3,
  RESPONSE_VALUE_WITH_ATTACHMENTS = 4,
  RESPONSE_NULL_VALUE_WITH_ATTACHMENTS = 5,
}