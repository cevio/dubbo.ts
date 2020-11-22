export const HEADER_LENGTH = 16;
export const MAGIC_HIGH = 0xda;
export const MAGIC_LOW = 0xbb;
export const ID_SERIALIZE = 2;
export const FLAG_REQEUST = 0x80;
export const FLAG_TWOWAY = 0x40;
export const FLAG_EVENT = 0x20; 

export enum RESPONSE_STATUS {
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

export enum RESPONSE_BODY_FLAG {
  RESPONSE_WITH_EXCEPTION = 0,
  RESPONSE_VALUE = 1,
  RESPONSE_NULL_VALUE = 2,
  RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS = 3,
  RESPONSE_VALUE_WITH_ATTACHMENTS = 4,
  RESPONSE_NULL_VALUE_WITH_ATTACHMENTS = 5,
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