import { fromBytes4, isHeartBeat, fromBytes8, isReplyHeart, heartBeatEncode, PROVIDER_CONTEXT_STATUS, PROVIDER_RESPONSE_BODY_FLAG } from '../utils';
import Channel from './channel';
const hassin = require('hessian.js');
const MAGIC_HIGH = 0xda;
const MAGIC_LOW = 0xbb;
const HEADER_LENGTH = 16;

export type DecodeType = {
  err: Error,
  res: any,
  requestId: number,
  attachments?: {
    path?: string,
    interface?: string,
    version?: string,
    group?: string,
    timeout?: number,
  },
}

export default class Decoder {
  private _buffer: Buffer;
  private _subscriber: (json: DecodeType) => any;
  public readonly app: Channel;
  constructor(app: Channel) {
    this.app = app;
    this._buffer = Buffer.alloc(0);
  }

  clearBuffer() {
    if (this._buffer.length > 0) {
      this._buffer = Buffer.alloc(0);
    }
  }

  subscribe(subscriber: (json: DecodeType) => any) {
    this._subscriber = subscriber;
    return this;
  }

  receive(data: Buffer) {
    this._buffer = Buffer.concat([this._buffer, data]);
    let bufferLength = this._buffer.length;
    while (bufferLength >= HEADER_LENGTH) {
      const magicHigh = this._buffer[0];
      const magicLow = this._buffer[1];
      if (magicHigh != MAGIC_HIGH || magicLow != MAGIC_LOW) {
        const magicHighIndex = this._buffer.indexOf(magicHigh);
        const magicLowIndex = this._buffer.indexOf(magicLow);
        if (magicHighIndex === -1 || magicLowIndex === -1) return;
        if (magicHighIndex !== -1 && magicLowIndex !== -1 && magicLowIndex - magicHighIndex === 1) {
          this._buffer = this._buffer.slice(magicHighIndex);
          bufferLength = this._buffer.length;
        }
        return;
      }
      if (magicHigh === MAGIC_HIGH && magicLow === MAGIC_LOW) {
        if (bufferLength < HEADER_LENGTH) return;
        const header = this._buffer.slice(0, HEADER_LENGTH);
        const bodyLengthBuff = Buffer.from([
          header[12],
          header[13],
          header[14],
          header[15],
        ]);
        const bodyLength = fromBytes4(bodyLengthBuff);
        if (isHeartBeat(header)) {
          const isReply = isReplyHeart(header);
          this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
          bufferLength = this._buffer.length;
          this.app.lastread = Date.now();
          if (isReply) this.app.client.write(heartBeatEncode(true));
          return;
        }
        if (HEADER_LENGTH + bodyLength > bufferLength) return;
        const dataBuffer = this._buffer.slice(0, HEADER_LENGTH + bodyLength);
        this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
        bufferLength = this._buffer.length;
        this.dispatch(dataBuffer);
      }
    }
  }

  private dispatch(bytes: Buffer) {
    let res = null;
    let err = null;
    let attachments = {};
    const requestIdBuff = bytes.slice(4, 12);
    const requestId = fromBytes8(requestIdBuff);
    const status = bytes[3];
    if (status != PROVIDER_CONTEXT_STATUS.OK) {
      return this._subscriber({
        err: new Error(bytes.slice(HEADER_LENGTH).toString()),
        res: null,
        attachments,
        requestId,
      });
    }

    const body = new hassin.DecoderV2(bytes.slice(HEADER_LENGTH));
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
        err =
            exception instanceof Error
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
    return this._subscriber({
        requestId,
        err,
        res,
        attachments,
    });
  }
}