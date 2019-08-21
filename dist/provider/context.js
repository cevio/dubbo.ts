"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compare = require("compare-versions");
const utils_1 = require("../utils");
const hassin = require('hessian.js');
class Context {
    constructor(conn, buf) {
        this.decoded = false;
        this.attachments = {};
        this.conn = conn;
        this.data = buf;
    }
    decode() {
        if (this.decoded)
            return;
        let buf = Buffer.concat([Buffer.alloc(0), this.data]);
        let bufferLength = buf.length;
        while (bufferLength >= utils_1.DUBBO_HEADER_LENGTH) {
            const magicHigh = buf[0];
            const magicLow = buf[1];
            if (magicHigh != utils_1.MAGIC_HIGH || magicLow != utils_1.MAGIC_LOW) {
                const magicHighIndex = buf.indexOf(magicHigh);
                const magicLowIndex = buf.indexOf(magicLow);
                if (magicHighIndex === -1 || magicLowIndex === -1)
                    return;
                if (magicHighIndex !== -1 && magicLowIndex !== -1 && magicLowIndex - magicHighIndex === 1) {
                    buf = buf.slice(magicHighIndex);
                    bufferLength = buf.length;
                }
                return;
            }
            if (magicHigh === utils_1.MAGIC_HIGH && magicLow === utils_1.MAGIC_LOW) {
                if (bufferLength < utils_1.DUBBO_HEADER_LENGTH)
                    return;
                const header = buf.slice(0, utils_1.DUBBO_HEADER_LENGTH);
                const bodyLengthBuff = Buffer.from([
                    header[12],
                    header[13],
                    header[14],
                    header[15],
                ]);
                const bodyLength = utils_1.fromBytes4(bodyLengthBuff);
                if (utils_1.isHeartBeat(header)) {
                    const isReply = utils_1.isReplyHeart(header);
                    buf = buf.slice(utils_1.DUBBO_HEADER_LENGTH + bodyLength);
                    bufferLength = buf.length;
                    if (isReply)
                        this.conn.send(utils_1.heartBeatEncode(true));
                    return;
                }
                if (utils_1.DUBBO_HEADER_LENGTH + bodyLength > bufferLength)
                    return;
                const dataBuffer = buf.slice(0, utils_1.DUBBO_HEADER_LENGTH + bodyLength);
                buf = buf.slice(utils_1.DUBBO_HEADER_LENGTH + bodyLength);
                bufferLength = buf.length;
                const requestIdBuff = dataBuffer.slice(4, 12);
                const requestId = utils_1.fromBytes8(requestIdBuff);
                const body = new hassin.DecoderV2(dataBuffer.slice(utils_1.DUBBO_HEADER_LENGTH, utils_1.DUBBO_HEADER_LENGTH + bodyLength));
                const dubboVersion = body.read();
                const interfaceName = body.read();
                const interfaceVersion = body.read();
                const method = body.read();
                const argumentTypeString = body.read();
                const i = utils_1.getDubboArgumentLength(argumentTypeString);
                const args = [];
                for (let j = 0; j < i; j++)
                    args.push(body.read());
                const attachments = body.read();
                this.req = {
                    requestId,
                    dubboVersion,
                    interfaceName,
                    interfaceVersion,
                    method,
                    parameters: args,
                    attachments,
                };
                this.decoded = true;
                const id = utils_1.getProviderServiceChunkId(interfaceName, this.req.attachments.group || '-', interfaceVersion || '0.0.0');
                const chunk = this.conn.provider.getChunkById(id);
                return this.conn.provider.emit('data', this, chunk);
            }
        }
    }
    encode() {
        const body = this.encodeBody();
        const head = this.encodeHead(body.length);
        return Buffer.concat([head, body]);
    }
    setRequestId(header) {
        const requestId = this.req.requestId;
        const buffer = utils_1.toBytes8(requestId);
        header[4] = buffer[0];
        header[5] = buffer[1];
        header[6] = buffer[2];
        header[7] = buffer[3];
        header[8] = buffer[4];
        header[9] = buffer[5];
        header[10] = buffer[6];
        header[11] = buffer[7];
    }
    encodeHead(payload) {
        const header = Buffer.alloc(utils_1.DUBBO_HEADER_LENGTH);
        header[0] = utils_1.DUBBO_MAGIC_HEADER >>> 8;
        header[1] = utils_1.DUBBO_MAGIC_HEADER & 0xff;
        header[2] = 0x02;
        header[3] = this.status;
        this.setRequestId(header);
        if (payload > 0 && payload > utils_1.DUBBO_DEFAULT_PAY_LOAD) {
            throw new Error(`Data length too large: ${payload}, max payload: ${utils_1.DUBBO_DEFAULT_PAY_LOAD}`);
        }
        header.writeUInt32BE(payload, 12);
        return header;
    }
    isSupportAttachments(version) {
        if (!version)
            return false;
        if (compare(version, '2.0.10') >= 0 && compare(version, '2.6.2') <= 0)
            return false;
        return compare(version, '2.0.2') >= 0;
    }
    encodeBody() {
        const encoder = new hassin.EncoderV2();
        const body = this.body;
        const attachments = this.attachments || {};
        const attach = this.isSupportAttachments(this.conn.provider.version);
        if (this.status !== utils_1.PROVIDER_CONTEXT_STATUS.OK) {
            encoder.write(attach ? utils_1.PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS : utils_1.PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_WITH_EXCEPTION);
            encoder.write(body);
        }
        else {
            if (body === undefined || body === null) {
                encoder.write(attach ? utils_1.PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE_WITH_ATTACHMENTS : utils_1.PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_NULL_VALUE);
            }
            else {
                encoder.write(attach ? utils_1.PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_VALUE_WITH_ATTACHMENTS : utils_1.PROVIDER_RESPONSE_BODY_FLAG.RESPONSE_VALUE);
                encoder.write(body);
            }
        }
        if (attach) {
            encoder.write(Object.assign(attachments, {
                dubbo: this.conn.provider.version,
            }));
        }
        return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
    }
}
exports.default = Context;
