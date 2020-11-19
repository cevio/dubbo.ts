import { Attachment } from './attachment';
import { HEADER_LENGTH, MAGIC_HIGH, MAGIC_LOW, toBytes8, ID_SERIALIZE, FLAG_REQEUST, FLAG_TWOWAY } from "./utils";

const hassin = require('hessian.js');

export class Request {
  static readonly HEARTBEAT_EVENT = 0x20;
  static readonly HEARTBEAT_CONTENT = 0x4e;
  private readonly HeaderBuffer = Buffer.alloc(HEADER_LENGTH);
  private isHeartBeat = false;
  private BodyBuffer: Buffer;

  constructor() {
    this.HeaderBuffer[0] = MAGIC_HIGH;
    this.HeaderBuffer[1] = MAGIC_LOW;
    this.HeaderBuffer[2] = ID_SERIALIZE | FLAG_REQEUST;
    this.HeaderBuffer[3] = 0x00;
  }

  public setRequestId(id: number) {
    const buffer = toBytes8(id);
    this.HeaderBuffer[4] = buffer[0];
    this.HeaderBuffer[5] = buffer[1];
    this.HeaderBuffer[6] = buffer[2];
    this.HeaderBuffer[7] = buffer[3];
    this.HeaderBuffer[8] = buffer[4];
    this.HeaderBuffer[9] = buffer[5];
    this.HeaderBuffer[10] = buffer[6];
    this.HeaderBuffer[11] = buffer[7];
    return this;
  }

  public setTwoWay(value: boolean) {
    this.HeaderBuffer[2] |= FLAG_TWOWAY;
    return this;
  }

  public setEvent(value: number) {
    this.HeaderBuffer[2] |= value;
    if (value === Request.HEARTBEAT_EVENT) {
      this.BodyBuffer = Buffer.alloc(1);
      this.BodyBuffer[0] = Request.HEARTBEAT_CONTENT;
      this.isHeartBeat = true;
    }
    return this;
  }

  public setData(data: Attachment) {
    if (this.isHeartBeat) return this;
    const encoder = new hassin.EncoderV2();
    const dubboVersion = data.getAttachment(Attachment.DUBBO_VERSION_KEY);
    const path = data.getAttachment(Attachment.PATH_KEY);
    const version = data.getAttachment(Attachment.VERSION_KEY);
    const methodName = data.getMethodName();
    const parameterType = data.getParameterType();
    const parameters = data.getParameters();

    encoder.write(dubboVersion);
    encoder.write(path);
    encoder.write(version);
    encoder.write(methodName);
    encoder.write(parameterType);
    for (let arg of parameters) {
      encoder.write(arg);
    }
    encoder.write(data.getAttachments());
    this.BodyBuffer = encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
    return this;
  }

  public value() {
    if (!this.BodyBuffer) throw new Error('non-bodyBuffer found.');
    const bodyLength = this.BodyBuffer.length;
    this.HeaderBuffer.writeUInt32BE(bodyLength, 12);
    return Buffer.concat([this.HeaderBuffer, this.BodyBuffer]);
  }
}