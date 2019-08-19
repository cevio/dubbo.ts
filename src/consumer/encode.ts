import { 
  DUBBO_HEADER_LENGTH,
  DUBBO_MAGIC_HEADER,
  FLAG_REQEUST,
  HESSIAN2_SERIALIZATION_CONTENT_ID,
  FLAG_TWOWAY,
  DUBBO_DEFAULT_PAY_LOAD,
  toBytes8,
  ConsumerEncodeBody
} from '../utils';

const hassin = require('hessian.js');

export default function Encode(options: ConsumerEncodeBody) {
  const body = encodeBody(options);
  const head = encodeHead(options.requestId, body.length);
  return Buffer.concat([head, body]);
}

function encodeHead(requestId: number, payload: number) {
  const header = Buffer.alloc(DUBBO_HEADER_LENGTH);
    header[0] = DUBBO_MAGIC_HEADER >>> 8;
    header[1] = DUBBO_MAGIC_HEADER & 0xff;
    header[2] = FLAG_REQEUST | HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_TWOWAY;
    setRequestId(requestId, header);
    if (payload > 0 && payload > DUBBO_DEFAULT_PAY_LOAD) {
      throw new Error(`Data length too large: ${payload}, max payload: ${DUBBO_DEFAULT_PAY_LOAD}`);
    }
    header.writeUInt32BE(payload, 12);
    return header;
}

function setRequestId(requestId: number, header: Buffer) {
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

function encodeBody(options: ConsumerEncodeBody) {
  const encoder = new hassin.EncoderV2();
  const { dubboVersion, dubboInterface, version, methodName, methodArgs } = options;
  encoder.write(dubboVersion);
  encoder.write(dubboInterface);
  encoder.write(version);
  encoder.write(methodName);
  encoder.write(getParameterTypes(methodArgs));
  if (methodArgs && methodArgs.length) {
    for (let arg of methodArgs) {
      encoder.write(arg);
    }
  }
  encoder.write(getAttachments(options));
  return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
}

function getParameterTypes(args: any[]) {
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

function getAttachments(options: ConsumerEncodeBody) {
  const { path, dubboInterface, group, timeout, version, application, attachments } = options;
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