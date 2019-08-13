
const DUBBO_HEADER_LENGTH = 16;
const DUBBO_MAGIC_HEADER = 0xdabb;
const FLAG_REQEUST = 0x80;
const FLAG_TWOWAY = 0x40;
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;
const DUBBO_DEFAULT_PAY_LOAD = 8 * 1024 * 1024; // 8M
const hassin = require('hessian.js');
import { toBytes8 } from '../utils';

type EncodeBody = {
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

export interface EncodeAttachments {
  [name: string]: any;
}

export default class Encoder {
  encode(options:EncodeBody)  {
    const body = this.encodeBody(options);
    const head = this.encodeHead(options, body.length);
    return Buffer.concat([head, body]);
  }

  setRequestId(requestId: number, header: Buffer) {
    const buffer = toBytes8(requestId);
    header[4] = buffer[0];
    header[5] = buffer[1];
    header[6] = buffer[2];
    header[7] = buffer[3];
    header[8] = buffer[4];
    header[9] = buffer[5];
    header[10] = buffer[6];
    header[11] = buffer[7];
  }

  encodeHead(options: EncodeBody, payload: number) {
    const header = Buffer.alloc(DUBBO_HEADER_LENGTH);
    header[0] = DUBBO_MAGIC_HEADER >>> 8;
    header[1] = DUBBO_MAGIC_HEADER & 0xff;
    header[2] = FLAG_REQEUST | HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_TWOWAY;
    this.setRequestId(options.requestId, header);
    if (payload > 0 && payload > DUBBO_DEFAULT_PAY_LOAD) {
      throw new Error(`Data length too large: ${payload}, max payload: ${DUBBO_DEFAULT_PAY_LOAD}`);
    }
    header.writeUInt32BE(payload, 12);
    return header;
  }

  encodeBody(options: EncodeBody) {
    //hessian v2
    const encoder = new hassin.EncoderV2();
    const { dubboVersion, dubboInterface, version, methodName, methodArgs, } = options;
    //dubbo version
    encoder.write(dubboVersion);
    //path interface
    encoder.write(dubboInterface);
    //interface version
    encoder.write(version);
    //method name
    encoder.write(methodName);
    //parameter types
    encoder.write(this.getParameterTypes(methodArgs));
    //arguments
    if (methodArgs && methodArgs.length) {
      for (let arg of methodArgs) {
        encoder.write(arg);
      }
    }
    //attachments
    encoder.write(this.getAttachments(options));
    return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
  }

  getParameterTypes(args: any[]) {
    if (!(args && args.length))  return '';
    const primitiveTypeRef: any = {
      void: 'V',
      boolean: 'Z',
      byte: 'B',
      char: 'C',
      double: 'D',
      float: 'F',
      int: 'I',
      long: 'J',
      short: 'S',
    };
    const desc = [];
    for (let arg of args) {
      let type = arg['$class'];
      if (type[0] === '[') {
        desc.push('[');
        type = type.slice(1);
      }
      if (primitiveTypeRef[type]) {
        desc.push(primitiveTypeRef[type]);
      }
      else {
        desc.push('L');
        desc.push(type.replace(/\./gi, '/'));
        desc.push(';');
      }
    }
    return desc.join('');
  }

  getAttachments(options: EncodeBody) {
    const { path, dubboInterface, group, timeout, version, application, attachments, } = options;
    //merge dubbo attachments and customize attachments
    const map = Object.assign({
      path: path || dubboInterface,
      interface: dubboInterface,
      version: version || '0.0.0',
    }, attachments || {});
    group && (map['group'] = group);
    timeout && (map['timeout'] = timeout);
    application && (map['application'] = application);
    let attachmentsHashMap = {
      $class: 'java.util.HashMap',
      $: map,
    };
    return attachmentsHashMap;
  }
}