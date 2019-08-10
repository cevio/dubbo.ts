import * as os from 'os';
import * as url from 'url';
import { InterfaceConfigs as ProviderInterfaceOptions } from './provider/interface';
import Registry from './registry';

const DUBBO_HEADER_LENGTH = 16;
const DUBBO_MAGIC_HEADER = 0xdabb;
const FLAG_REQEUST = 0x80;
const FLAG_TWOWAY = 0x40;
const FLAG_EVENT = 0x20;
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;

export enum CREATE_MODES {
  PERSISTENT = 0,
  PERSISTENT_SEQUENTIAL = 2,
  EPHEMERAL = 1,
  EPHEMERAL_SEQUENTIAL = 3,
}

export function ProviderRegisterUri(
  root: string, 
  host: string, 
  application: string, 
  dubboversion: string, 
  pid: number,
  options: ProviderInterfaceOptions
) {
  const obj = {
    protocol: "dubbo",
    slashes: true,
    host: `${host}/${options.interface}`,
    query: {
      anyhost: true,
      application,
      category: "providers",
      dubbo: dubboversion,
      generic: false,
      interface: options.interface,
      methods: options.methods && Array.isArray(options.methods) && options.methods.length ? options.methods.join(',') : undefined,
      pid,
      revision: options.revision || options.version || '0.0.0',
      side: 'provider',
      timestamp: Date.now(),
      version: options.version || '0.0.0',
      'default.group': options.group,
      'default.delay': options.delay === undefined ? -1 : options.delay,
      'default.retries': options.retries || 2,
      'default.timeout': options.timeout || 3000,
    }
  }
  const interface_root_path = `/${root}/${options.interface}`;
  const interface_dir_path = interface_root_path + '/providers';
  const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(url.format(obj));
  return {
    interface_root_path,
    interface_dir_path,
    interface_entry_path,
  };
}

export function isLoopback(addr: string) {
  return (
    /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(addr) ||
    /^fe80::1$/.test(addr) ||
    /^::1$/.test(addr) ||
    /^::$/.test(addr)
  );
}

export function ip() {
  const interfaces = os.networkInterfaces();
  return Object.keys(interfaces)
    .map(function(nic) {
      const addresses = interfaces[nic].filter(details => details.family.toLowerCase() === "ipv4" && !isLoopback(details.address));
      return addresses.length ? addresses[0].address : undefined;
    })
    .filter(Boolean)[0];
}

export function zookeeperCreateNode(registry: Registry, uri: string, mode: CREATE_MODES) {
  return new Promise(function(resolve, reject) {
    registry.zk.exists(uri, (err, stat) => {
      if (err) return reject(err);
      if (stat) return resolve();
      registry.zk.create(uri, mode, (err, node) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export function zookeeperRemoveNode(registry: Registry, uri: string) {
  return new Promise(function(resolve, reject) {
    registry.zk.exists(uri, (err, stat) => {
      if (err) return reject(err);
      if (!stat) return resolve();
      registry.zk.remove(uri, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
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

export function heartBeatEncode() {
  const buffer = Buffer.alloc(DUBBO_HEADER_LENGTH + 1);
  buffer[0] = DUBBO_MAGIC_HEADER >>> 8;
  buffer[1] = DUBBO_MAGIC_HEADER & 0xff;
  buffer[2] =
      FLAG_REQEUST |
          HESSIAN2_SERIALIZATION_CONTENT_ID |
          FLAG_TWOWAY |
          FLAG_EVENT;
  buffer[15] = 1;
  buffer[16] = 0x4e;
  return buffer;
}

export function isHeartBeat(buf: Buffer) {
  const flag = buf[2];
  return (flag & FLAG_EVENT) !== 0;
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