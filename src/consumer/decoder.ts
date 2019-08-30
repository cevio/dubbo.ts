import Channel from './channel';
import {
  DUBBO_HEADER_LENGTH,
  MAGIC_HIGH,
  MAGIC_LOW,
  fromBytes4,
  isHeartBeat,
  isReplyHeart,
  heartBeatEncode,
  fromBytes8,
  PROVIDER_CONTEXT_STATUS,
  PROVIDER_RESPONSE_BODY_FLAG
} from '../utils';
const hassin = require('hessian.js');
export default class Decoder {
  private buf: Buffer = Buffer.alloc(0);

  receive(channel: Channel, data: Buffer, callback: (options: {
    err: Error,
    res: any,
    requestId: number,
    attachments: {
      [name: string]: any
    },
  }) => void) {
    this.buf = Buffer.concat([this.buf, data]);
    let bufferLength = this.buf.length;
    while (bufferLength >= DUBBO_HEADER_LENGTH) {
      const magicHigh = this.buf[0];
      const magicLow = this.buf[1];
      if (magicHigh != MAGIC_HIGH || magicLow != MAGIC_LOW) {
        const magicHighIndex = this.buf.indexOf(magicHigh);
        const magicLowIndex = this.buf.indexOf(magicLow);
        if (magicHighIndex === -1 || magicLowIndex === -1) return;
        if (magicHighIndex !== -1 && magicLowIndex !== -1 && magicLowIndex - magicHighIndex === 1) {
          this.buf = this.buf.slice(magicHighIndex);
          bufferLength = this.buf.length;
        }
        return;
      }
      if (magicHigh === MAGIC_HIGH && magicLow === MAGIC_LOW) {
        if (bufferLength < DUBBO_HEADER_LENGTH) return;
        const header = this.buf.slice(0, DUBBO_HEADER_LENGTH);
        const bodyLengthBuff = Buffer.from([
          header[12],
          header[13],
          header[14],
          header[15],
        ]);
        const bodyLength = fromBytes4(bodyLengthBuff);
        if (isHeartBeat(header)) {
          const isReply = isReplyHeart(header);
          this.buf = this.buf.slice(DUBBO_HEADER_LENGTH + bodyLength);
          bufferLength = this.buf.length;
          if (isReply) channel.send(heartBeatEncode(true));
          return;
        }
        if (DUBBO_HEADER_LENGTH + bodyLength > bufferLength) return;
        const dataBuffer = this.buf.slice(0, DUBBO_HEADER_LENGTH + bodyLength);
        this.buf = this.buf.slice(DUBBO_HEADER_LENGTH + bodyLength);
        bufferLength = this.buf.length;
        /////////////////////////////////////
        let res = null;
        let err = null;
        let attachments = {};
        const requestIdBuff = dataBuffer.slice(4, 12);
        const requestId = fromBytes8(requestIdBuff);
        const status = dataBuffer[3];
        if (status != PROVIDER_CONTEXT_STATUS.OK) {
          return callback({
            err: new Error(dataBuffer.slice(DUBBO_HEADER_LENGTH + 2).toString('utf8')),
            res: null,
            attachments,
            requestId,
          });
        }
        const body = new hassin.DecoderV2(dataBuffer.slice(DUBBO_HEADER_LENGTH));
        const flag = body.readInt();
        switch (flag) {
          case PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_VALUE:
            err = null;
            res = body.read();
            attachments = {};
            break;
          case PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE:
            err = null;
            res = null;
            attachments = {};
            break;
          case PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION:
            const exception = body.read();
            err = exception instanceof Error
              ? exception
              : new Error(exception);
            res = null;
            attachments = {};
            break;
          case PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS:
            err = null;
            res = null;
            attachments = body.read();
            break;
          case PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS:
            err = null;
            res = body.read();
            attachments = body.read();
            break;
          case PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS:
            const exp = body.read();
            err = exp instanceof Error ? exp : new Error(exp);
            res = null;
            attachments = body.read();
            break;
          default:
            err = new Error(`Unknown result flag, expect '0/1/2/3/4/5', get  ${flag})`);
            res = null;
        }
        callback({
          requestId,
          err,
          res,
          attachments,
        });
      }
    }
  }
}