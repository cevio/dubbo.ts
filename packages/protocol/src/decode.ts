import { 
  HEADER_LENGTH, 
  MAGIC_HIGH, 
  MAGIC_LOW, 
  fromBytes4, 
  fromBytes8, 
  getDubboArgumentLength, 
  FLAG_TWOWAY, 
  FLAG_REQEUST, 
  FLAG_EVENT, 
  RESPONSE_STATUS, 
  RESPONSE_BODY_FLAG 
} from './utils';

const hassin = require('hessian.js');

export interface TDecodeRequestSchema {
  isTwoWay: boolean,
  id: number,
  dubbo_version: string,
  interface: string,
  version: string,
  method: string,
  parameters: any[],
  attachments: Record<string, string>,
}

export interface TDecodeResponseSchema {
  error?: Error,
  data?: any,
  attachments?: Record<string, string>,
  id: number,
}

export function decodeBuffer(buffer: Buffer, callbacks: {
  heartbeat: () => void,
  request?: (result: TDecodeRequestSchema) => void,
  response?: (result: TDecodeResponseSchema) => void,
}) {
  let buf = buffer;
  let bufferLength = buf.length;
  if (bufferLength < HEADER_LENGTH) {
    // 非完整头部长度数据
    // 则重填回池
    return buf;
  }
  while (bufferLength >= HEADER_LENGTH) {
    const magicHigh = buf[0];
    const magicLow = buf[1];
    // 查询魔法位起始位置
    if (magicHigh != MAGIC_HIGH || magicLow !== MAGIC_LOW) {
      const magicHighIndex = buf.indexOf(MAGIC_HIGH);
      const magicLowIndex = buf.indexOf(MAGIC_LOW);
      if (magicHighIndex === -1 || magicLowIndex === -1) return buf;
      if (magicHighIndex !== -1 && magicLowIndex !== -1 && magicLowIndex - magicHighIndex === 1) {
        buf = buf.slice(magicHighIndex);
        bufferLength = buf.length;
        // 因改变数据长度，需要再次监测是否完整头部长度数据
        // 如果非完整则重填回池
        if (bufferLength < HEADER_LENGTH) return buf;
        continue;
      }
      return buf;
    }

    const headerBuffer = buf.slice(0, HEADER_LENGTH);
    const bodyLengthBuff = Buffer.from([
      headerBuffer[12],
      headerBuffer[13],
      headerBuffer[14],
      headerBuffer[15],
    ]);
    const bodyLength = fromBytes4(bodyLengthBuff);
    // 如果非完整数据则重填回池
    if (bufferLength < HEADER_LENGTH + bodyLength) return buf;
    const bodyBuffer = buf.slice(HEADER_LENGTH, HEADER_LENGTH + bodyLength);

    buf = buf.slice(HEADER_LENGTH + bodyLength);
    bufferLength = buf.length;
    
    const isTwoWay = (headerBuffer[2] & FLAG_TWOWAY) !== 0;
    const isResponse = (headerBuffer[2] & FLAG_REQEUST) === 0;
    const isHeartBeat = (headerBuffer[2] & FLAG_EVENT) !== 0;

    if (isHeartBeat) {
      if (isTwoWay) callbacks.heartbeat();
      if (bufferLength > 0) {
        if (bufferLength < HEADER_LENGTH) return buf;
        continue;
      }
      return;
    }

    const requestIdBuff = headerBuffer.slice(4, 12);
    const requestId = fromBytes8(requestIdBuff);

    if (isResponse) {
      const body = new hassin.DecoderV2(bodyBuffer);
      const flag = body.read();
      switch (flag) {
        case RESPONSE_BODY_FLAG.RESPONSE_VALUE:
          callbacks.response({
            data: body.read(),
            id: requestId,
          });
          break;
        case RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE:
          callbacks.response({
            id: requestId,
          });
          break;
        case RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION:
          const exception = body.read();
          callbacks.response({
            error: exception instanceof Error
              ? exception
              : new Error(exception),
            id: requestId,
          });
          break;
        case RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS:
          callbacks.response({
            attachments: body.read(),
            id: requestId,
          });
          break;
        case RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS:
          callbacks.response({
            data: body.read(),
            attachments: body.read(),
            id: requestId,
          });
          break;
        case RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS:
          const exp = body.read();
          callbacks.response({
            error: exp instanceof Error ? exp : new Error(exp),
            attachments: body.read(),
            id: requestId,
          })
          break;
        default:
          if (typeof flag === 'number') {
            callbacks.response({
              error: new Error(`Unknown result flag, expect '0/1/2/3/4/5', get  ${flag})`),
              id: requestId,
            });
          } else {
            const exception = flag;
            callbacks.response({
              error: exception instanceof Error
                ? exception
                : new Error(exception),
              id: requestId,
            });
          }
          
      }
    } else {
      const body = new hassin.DecoderV2(bodyBuffer);
      const dubboVersion = body.read();
      const interfaceName = body.read();
      const interfaceVersion = body.read();
      const method = body.read();
      const argumentTypeString = body.read();
      const i = getDubboArgumentLength(argumentTypeString);
      const args = [];
      for (let j = 0; j < i; j++) args.push(body.read());
      const attachments = body.read();
      callbacks.request({
        isTwoWay,
        id: requestId,
        dubbo_version: dubboVersion,
        interface: interfaceName,
        version: interfaceVersion,
        method,
        parameters: args,
        attachments
      });
    }

    if (bufferLength < HEADER_LENGTH) return buf;
  }
}