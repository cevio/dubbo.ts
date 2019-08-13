"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const url = require("url");
const DUBBO_HEADER_LENGTH = 16;
const DUBBO_MAGIC_HEADER = 0xdabb;
const FLAG_REQEUST = 0x80;
const FLAG_TWOWAY = 0x40;
const FLAG_EVENT = 0x20;
const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;
var CREATE_MODES;
(function (CREATE_MODES) {
    CREATE_MODES[CREATE_MODES["PERSISTENT"] = 0] = "PERSISTENT";
    CREATE_MODES[CREATE_MODES["PERSISTENT_SEQUENTIAL"] = 2] = "PERSISTENT_SEQUENTIAL";
    CREATE_MODES[CREATE_MODES["EPHEMERAL"] = 1] = "EPHEMERAL";
    CREATE_MODES[CREATE_MODES["EPHEMERAL_SEQUENTIAL"] = 3] = "EPHEMERAL_SEQUENTIAL";
})(CREATE_MODES = exports.CREATE_MODES || (exports.CREATE_MODES = {}));
function ConsumerRegisterUri(root, host, application, dubboversion, pid, options) {
    const obj = {
        protocol: "consumer",
        slashes: true,
        host: `${host}/${options.interface}`,
        query: {
            application,
            category: "consumers",
            dubbo: dubboversion,
            interface: options.interface,
            pid,
            revision: options.version || '0.0.0',
            side: 'consumer',
            timestamp: Date.now(),
            version: options.version || '0.0.0',
            group: options.group,
        }
    };
    if (!obj.query.group) {
        delete obj.query.group;
    }
    const interface_root_path = `/${root}/${options.interface}`;
    const interface_dir_path = interface_root_path + '/consumers';
    const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(url.format(obj));
    return {
        interface_root_path,
        interface_dir_path,
        interface_entry_path,
    };
}
exports.ConsumerRegisterUri = ConsumerRegisterUri;
function ProviderRegisterUri(root, host, application, dubboversion, pid, heartbeat, options) {
    const obj = {
        protocol: "dubbo",
        slashes: true,
        host: `${host}/${options.interface}`,
        query: {
            anyhost: true,
            application,
            category: "providers",
            dubbo: dubboversion,
            generic: false,
            heartbeat: heartbeat,
            interface: options.interface,
            methods: options.methods && Array.isArray(options.methods) && options.methods.length ? options.methods.join(',') : undefined,
            pid,
            revision: options.revision || options.version || '0.0.0',
            side: 'provider',
            timestamp: Date.now(),
            version: options.version || '0.0.0',
            'default.group': options.group,
            'default.delay': options.delay === undefined ? -1 : options.delay,
            'default.retries': options.retries || 2,
            'default.timeout': options.timeout || 3000,
        }
    };
    if (!obj.query['default.group']) {
        delete obj.query['default.group'];
    }
    const interface_root_path = `/${root}/${options.interface}`;
    const interface_dir_path = interface_root_path + '/providers';
    const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(url.format(obj));
    return {
        interface_root_path,
        interface_dir_path,
        interface_entry_path,
    };
}
exports.ProviderRegisterUri = ProviderRegisterUri;
function isLoopback(addr) {
    return (/^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/.test(addr) ||
        /^fe80::1$/.test(addr) ||
        /^::1$/.test(addr) ||
        /^::$/.test(addr));
}
exports.isLoopback = isLoopback;
function ip() {
    const interfaces = os.networkInterfaces();
    return Object.keys(interfaces)
        .map(function (nic) {
        const addresses = interfaces[nic].filter(details => details.family.toLowerCase() === "ipv4" && !isLoopback(details.address));
        return addresses.length ? addresses[0].address : undefined;
    })
        .filter(Boolean)[0];
}
exports.ip = ip;
function zookeeperCreateNode(registry, uri, mode) {
    return new Promise(function (resolve, reject) {
        registry.zk.exists(uri, (err, stat) => {
            if (err)
                return reject(err);
            if (stat)
                return resolve();
            registry.zk.create(uri, mode, (err, node) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    });
}
exports.zookeeperCreateNode = zookeeperCreateNode;
function zookeeperRemoveNode(registry, uri) {
    return new Promise(function (resolve, reject) {
        registry.zk.exists(uri, (err, stat) => {
            if (err)
                return reject(err);
            if (!stat)
                return resolve();
            registry.zk.remove(uri, err => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
    });
}
exports.zookeeperRemoveNode = zookeeperRemoveNode;
function zookeeperExistsNode(registry, uri) {
    return new Promise(function (resolve, reject) {
        registry.zk.exists(uri, (err, stat) => {
            if (err)
                return reject(err);
            return resolve(!!stat);
        });
    });
}
exports.zookeeperExistsNode = zookeeperExistsNode;
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
function heartBeatEncode(isReply) {
    const buffer = Buffer.alloc(DUBBO_HEADER_LENGTH + 1);
    buffer[0] = DUBBO_MAGIC_HEADER >>> 8;
    buffer[1] = DUBBO_MAGIC_HEADER & 0xff;
    buffer[2] = isReply
        ? HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_EVENT
        : FLAG_REQEUST | HESSIAN2_SERIALIZATION_CONTENT_ID | FLAG_TWOWAY | FLAG_EVENT;
    buffer[15] = 1;
    buffer[16] = 0x4e;
    return buffer;
}
exports.heartBeatEncode = heartBeatEncode;
function isHeartBeat(buf) {
    const flag = buf[2];
    return (flag & FLAG_EVENT) !== 0;
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
