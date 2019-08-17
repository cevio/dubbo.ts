"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
exports.DUBBO_HEADER_LENGTH = 16;
exports.DUBBO_MAGIC_HEADER = 0xdabb;
exports.FLAG_REQEUST = 0x80;
exports.FLAG_TWOWAY = 0x40;
exports.FLAG_EVENT = 0x20;
exports.HESSIAN2_SERIALIZATION_CONTENT_ID = 2;
exports.MAGIC_HIGH = 0xda;
exports.MAGIC_LOW = 0xbb;
exports.DUBBO_DEFAULT_PAY_LOAD = 8 * 1024 * 1024;
var CREATE_MODES;
(function (CREATE_MODES) {
    CREATE_MODES[CREATE_MODES["PERSISTENT"] = 0] = "PERSISTENT";
    CREATE_MODES[CREATE_MODES["PERSISTENT_SEQUENTIAL"] = 2] = "PERSISTENT_SEQUENTIAL";
    CREATE_MODES[CREATE_MODES["EPHEMERAL"] = 1] = "EPHEMERAL";
    CREATE_MODES[CREATE_MODES["EPHEMERAL_SEQUENTIAL"] = 3] = "EPHEMERAL_SEQUENTIAL";
})(CREATE_MODES = exports.CREATE_MODES || (exports.CREATE_MODES = {}));
const interfaces = os.networkInterfaces();
exports.localhost = Object.keys(interfaces).map(function (nic) {
    const addresses = interfaces[nic].filter(details => details.family.toLowerCase() === "ipv4" && !isLoopback(details.address));
    return addresses.length ? addresses[0].address : undefined;
}).filter(Boolean)[0];
function getProviderServiceChunkId(interfacename, interfacegroup, interfaceversion) {
    return `ProviderService:${interfacename}#${interfacegroup}@${interfaceversion}`;
}
exports.getProviderServiceChunkId = getProviderServiceChunkId;
function isLoopback(addr) {
    return (/^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(addr) ||
        /^fe80::1$/.test(addr) ||
        /^::1$/.test(addr) ||
        /^::$/.test(addr));
}
function heartBeatEncode(isReply) {
    const buffer = Buffer.alloc(exports.DUBBO_HEADER_LENGTH + 1);
    buffer[0] = exports.DUBBO_MAGIC_HEADER >>> 8;
    buffer[1] = exports.DUBBO_MAGIC_HEADER & 0xff;
    buffer[2] = isReply
        ? exports.HESSIAN2_SERIALIZATION_CONTENT_ID | exports.FLAG_EVENT
        : exports.FLAG_REQEUST | exports.HESSIAN2_SERIALIZATION_CONTENT_ID | exports.FLAG_TWOWAY | exports.FLAG_EVENT;
    buffer[15] = 1;
    buffer[16] = 0x4e;
    return buffer;
}
exports.heartBeatEncode = heartBeatEncode;
function toBytes4(num) {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(num, 0);
    return buf;
}
exports.toBytes4 = toBytes4;
function fromBytes4(buf) {
    return buf.readUInt32BE(0);
}
exports.fromBytes4 = fromBytes4;
function toBytes8(num) {
    const buf = Buffer.allocUnsafe(8);
    const high = Math.floor(num / 4294967296);
    const low = (num & 0xffffffff) >>> 0;
    buf.writeUInt32BE(high, 0);
    buf.writeUInt32BE(low, 4);
    return buf;
}
exports.toBytes8 = toBytes8;
function fromBytes8(buf) {
    const high = buf.readUInt32BE(0);
    const low = buf.readUInt32BE(4);
    return high * 4294967296 + low;
}
exports.fromBytes8 = fromBytes8;
function isHeartBeat(buf) {
    const flag = buf[2];
    return (flag & exports.FLAG_EVENT) !== 0;
}
exports.isHeartBeat = isHeartBeat;
function isReplyHeart(buf) {
    const flag = buf[2];
    return (flag & 0xE0) === 224;
}
exports.isReplyHeart = isReplyHeart;
function getDubboArgumentLength(str) {
    return getDubboArrayArgumentLength(str, 0);
}
exports.getDubboArgumentLength = getDubboArgumentLength;
function getDubboArrayArgumentLength(str, i) {
    const dot = str.charAt(0);
    switch (dot) {
        case '[': return getDubboNormalizeArgumentLength(str.substring(1), i);
        default: return getDubboNormalizeArgumentLength(str, i);
    }
}
function getDubboNormalizeArgumentLength(str, i) {
    if (!str)
        return i;
    const dot = str.charAt(0);
    switch (dot) {
        case 'L':
            const j = str.indexOf(';');
            if (j > -1)
                return getDubboArrayArgumentLength(str.substring(j + 1), i + 1);
            return i;
        default: return getDubboArrayArgumentLength(str.substring(1), i + 1);
    }
}
var PROVIDER_CONTEXT_STATUS;
(function (PROVIDER_CONTEXT_STATUS) {
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["OK"] = 20] = "OK";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["CLIENT_TIMEOUT"] = 30] = "CLIENT_TIMEOUT";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["SERVER_TIMEOUT"] = 31] = "SERVER_TIMEOUT";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["BAD_REQUEST"] = 40] = "BAD_REQUEST";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["BAD_RESPONSE"] = 50] = "BAD_RESPONSE";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["SERVICE_NOT_FOUND"] = 60] = "SERVICE_NOT_FOUND";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["SERVICE_ERROR"] = 70] = "SERVICE_ERROR";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["SERVER_ERROR"] = 80] = "SERVER_ERROR";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["CLIENT_ERROR"] = 90] = "CLIENT_ERROR";
    PROVIDER_CONTEXT_STATUS[PROVIDER_CONTEXT_STATUS["SERVER_THREADPOOL_EXHAUSTED"] = 100] = "SERVER_THREADPOOL_EXHAUSTED";
})(PROVIDER_CONTEXT_STATUS = exports.PROVIDER_CONTEXT_STATUS || (exports.PROVIDER_CONTEXT_STATUS = {}));
var PROVIDER_RESPONSE_BODY_FLAG;
(function (PROVIDER_RESPONSE_BODY_FLAG) {
    PROVIDER_RESPONSE_BODY_FLAG[PROVIDER_RESPONSE_BODY_FLAG["RESPONSE_WITH_EXCEPTION"] = 0] = "RESPONSE_WITH_EXCEPTION";
    PROVIDER_RESPONSE_BODY_FLAG[PROVIDER_RESPONSE_BODY_FLAG["RESPONSE_VALUE"] = 1] = "RESPONSE_VALUE";
    PROVIDER_RESPONSE_BODY_FLAG[PROVIDER_RESPONSE_BODY_FLAG["RESPONSE_NULL_VALUE"] = 2] = "RESPONSE_NULL_VALUE";
    PROVIDER_RESPONSE_BODY_FLAG[PROVIDER_RESPONSE_BODY_FLAG["RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS"] = 3] = "RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS";
    PROVIDER_RESPONSE_BODY_FLAG[PROVIDER_RESPONSE_BODY_FLAG["RESPONSE_VALUE_WITH_ATTACHMENTS"] = 4] = "RESPONSE_VALUE_WITH_ATTACHMENTS";
    PROVIDER_RESPONSE_BODY_FLAG[PROVIDER_RESPONSE_BODY_FLAG["RESPONSE_NULL_VALUE_WITH_ATTACHMENTS"] = 5] = "RESPONSE_NULL_VALUE_WITH_ATTACHMENTS";
})(PROVIDER_RESPONSE_BODY_FLAG = exports.PROVIDER_RESPONSE_BODY_FLAG || (exports.PROVIDER_RESPONSE_BODY_FLAG = {}));
