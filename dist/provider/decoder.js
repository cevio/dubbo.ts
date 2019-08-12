"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const hassin = require('hessian.js');
const MAGIC_HIGH = 0xda;
const MAGIC_LOW = 0xbb;
const HEADER_LENGTH = 16;
class Decoder {
    constructor(app) {
        this._app = app;
        this._buffer = Buffer.alloc(0);
    }
    clearBuffer() {
        if (this._buffer.length > 0) {
            this._buffer = Buffer.alloc(0);
        }
    }
    subscribe(subscriber) {
        this._subscriber = subscriber;
        return this;
    }
    receive(data) {
        this._buffer = Buffer.concat([this._buffer, data]);
        let bufferLength = this._buffer.length;
        while (bufferLength >= HEADER_LENGTH) {
            const magicHigh = this._buffer[0];
            const magicLow = this._buffer[1];
            if (magicHigh != MAGIC_HIGH || magicLow != MAGIC_LOW) {
                const magicHighIndex = this._buffer.indexOf(magicHigh);
                const magicLowIndex = this._buffer.indexOf(magicLow);
                if (magicHighIndex === -1 || magicLowIndex === -1)
                    return;
                if (magicHighIndex !== -1 && magicLowIndex !== -1 && magicLowIndex - magicHighIndex === 1) {
                    this._buffer = this._buffer.slice(magicHighIndex);
                    bufferLength = this._buffer.length;
                }
                return;
            }
            if (magicHigh === MAGIC_HIGH && magicLow === MAGIC_LOW) {
                if (bufferLength < HEADER_LENGTH)
                    return;
                const header = this._buffer.slice(0, HEADER_LENGTH);
                const bodyLengthBuff = Buffer.from([
                    header[12],
                    header[13],
                    header[14],
                    header[15],
                ]);
                const bodyLength = utils_1.fromBytes4(bodyLengthBuff);
                if (utils_1.isHeartBeat(header)) {
                    this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
                    bufferLength = this._buffer.length;
                    this._app.lastread = Date.now();
                    return;
                }
                if (HEADER_LENGTH + bodyLength > bufferLength)
                    return;
                const dataBuffer = this._buffer.slice(0, HEADER_LENGTH + bodyLength);
                this._buffer = this._buffer.slice(HEADER_LENGTH + bodyLength);
                bufferLength = this._buffer.length;
                this.dispatch(dataBuffer, bodyLength);
            }
        }
    }
    dispatch(bytes, bodyLen) {
        const requestIdBuff = bytes.slice(4, 12);
        const requestId = utils_1.fromBytes8(requestIdBuff);
        const body = new hassin.DecoderV2(bytes.slice(HEADER_LENGTH, HEADER_LENGTH + bodyLen));
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
        this._subscriber({
            requestId,
            dubboVersion,
            interfaceName,
            interfaceVersion,
            method,
            parameters: args,
            attachments,
        });
    }
}
exports.default = Decoder;
