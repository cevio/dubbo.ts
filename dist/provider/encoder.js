"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DUBBO_HEADER_LENGTH = 16;
const DUBBO_MAGIC_HEADER = 0xdabb;
const FLAG_REQEUST = 0x80;
const FLAG_TWOWAY = 0x40;
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;
const DUBBO_DEFAULT_PAY_LOAD = 8 * 1024 * 1024;
const hassin = require('hessian.js');
const utils_1 = require("../utils");
const compare = require("compare-versions");
class Encoder {
    constructor(ctx) {
        this.ctx = ctx;
    }
    encode() {
        const body = this.encodeBody();
        const head = this.encodeHead(body.length);
        return Buffer.concat([head, body]);
    }
    setRequestId(header) {
        const requestId = this.ctx.requestId;
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
        const header = Buffer.alloc(DUBBO_HEADER_LENGTH);
        header[0] = DUBBO_MAGIC_HEADER >>> 8;
        header[1] = DUBBO_MAGIC_HEADER & 0xff;
        header[2] = 0x02;
        header[3] = this.ctx.status;
        this.setRequestId(header);
        if (payload > 0 && payload > DUBBO_DEFAULT_PAY_LOAD) {
            throw new Error(`Data length too large: ${payload}, max payload: ${DUBBO_DEFAULT_PAY_LOAD}`);
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
        const body = this.ctx.body;
        const attachments = this.ctx.attachments || {};
        const attach = this.isSupportAttachments(this.ctx.dubboVersion);
        if (this.ctx.status !== utils_1.PROVIDER_CONTEXT_STATUS.OK) {
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
                dubbo: this.ctx.dubboVersion,
            }));
        }
        return encoder.byteBuffer._bytes.slice(0, encoder.byteBuffer._offset);
    }
}
exports.default = Encoder;
