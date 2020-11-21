import { Attachment } from "./attachment";
import { HEADER_LENGTH, MAGIC_HIGH, MAGIC_LOW, RESPONSE_STATUS, toBytes8, ID_SERIALIZE, RESPONSE_BODY_FLAG } from "./utils";

const compare = require('compare-versions');
const hassin = require('hessian.js');

export class Response {
  static readonly HEARTBEAT_EVENT = 0x20;
  static readonly HEARTBEAT_CONTENT = 0x4e;
  private readonly HeaderBuffer = Buffer.alloc(HEADER_LENGTH);
  private isHeartBeat = false;
  private BodyBuffer: Buffer;
  constructor() {
    this.HeaderBuffer[0] = MAGIC_HIGH;
    this.HeaderBuffer[1] = MAGIC_LOW;
    this.HeaderBuffer[2] = ID_SERIALIZE;
  }

  public setEvent(value: number) {
    this.HeaderBuffer[2] |= value;
    if (value === Response.HEARTBEAT_EVENT) {
      this.BodyBuffer = Buffer.alloc(1);
      this.BodyBuffer[0] = Response.HEARTBEAT_CONTENT;
      this.isHeartBeat = true;
    }
    return this;
  }

  public setStatusCode(code: RESPONSE_STATUS) {
    this.HeaderBuffer[3] = code;
    return this;
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

  public setData(attchment: Attachment, json: any) {
    if (this.isHeartBeat) return this;
    const encoder = new hassin.EncoderV2();
    const dubboVersion = attchment.getAttachment(Attachment.DUBBO_VERSION_KEY);
    const attach = this.isSupportAttachments(dubboVersion);
    if (this.HeaderBuffer[3] !== RESPONSE_STATUS.OK) {
      encoder.write(
        attach
          ? RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS
          : RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION
      );
      encoder.write(json);
    } else {
      if (json === undefined || json === null) {
        encoder.write(
          attach
            ? RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS
            : RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE
        )
      } else {
        encoder.write(
          attach
            ? RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS
            : RESPONSE_BODY_FLAG.RESPONSE_VALUE
        );
        encoder.write(json);
      }
    }
    if (attach) encoder.write(attchment.getAttachments());
    this.BodyBuffer = encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
    return this;
  }

  private isSupportAttachments(version?: string) {
    if (!version) return false;
    if (compare(version, '2.0.10') >= 0 && compare(version, '2.6.2') <= 0) return false;
    return compare(version, '2.0.2') >= 0;
  }

  public value() {
    if (!this.BodyBuffer) throw new Error('non-bodyBuffer found.');
    const bodyLength = this.BodyBuffer.length;
    this.HeaderBuffer.writeUInt32BE(bodyLength, 12);
    return Buffer.concat([this.HeaderBuffer, this.BodyBuffer]);
  }
}