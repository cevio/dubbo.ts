"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decoder_1 = require("./decoder");
const utils_1 = require("@nelts/utils");
const context_1 = require("./context");
const encoder_1 = require("./encoder");
const utils_2 = require("../utils");
class Connection extends utils_1.EventEmitter {
    constructor(app, socket) {
        super();
        this._lastread_timestamp = 0;
        this._lastwrite_timestamp = 0;
        this.app = app;
        this.socket = socket;
        const heartbeat = this.app.heartbeat;
        const heartbeat_timeout = this.app.heartbeatTimeout;
        const decoder = new decoder_1.default(this);
        decoder.subscribe(this.onMessage.bind(this));
        socket.on('data', (data) => decoder.receive(data));
        socket.on('close', () => this.app.sync('drop', this));
        socket.on('error', (err) => this.app.logger.error(err));
        this.timer = setInterval(() => {
            const time = Date.now();
            if ((this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat_timeout) ||
                (this._lastwrite_timestamp > 0 && time - this._lastwrite_timestamp > heartbeat_timeout)) {
                return this.app.sync('drop', this);
            }
            if ((this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat) ||
                (this._lastwrite_timestamp && time - this._lastwrite_timestamp > heartbeat)) {
                this.sendHeartbeat();
            }
        }, heartbeat);
        this.sendHeartbeat();
    }
    set lastread(value) {
        this._lastread_timestamp = value;
    }
    get lastread() {
        return this._lastread_timestamp;
    }
    sendHeartbeat() {
        this.socket.write(utils_2.heartBeatEncode());
        this._lastwrite_timestamp = Date.now();
    }
    async destroy() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.socket.destroy();
    }
    onMessage(json) {
        const ctx = new context_1.default(this, json);
        const encoder = new encoder_1.default(ctx);
        const group = ctx.group;
        const interacename = ctx.interfaceName;
        const interfaceversion = ctx.interfaceVersion;
        const services = this.app.services;
        if (!services[group])
            return this.replyError(encoder, ctx.error('cannot find the group:' + group, utils_2.PROVIDER_CONTEXT_STATUS.SERVICE_NOT_FOUND));
        if (!services[group][interacename])
            return this.replyError(encoder, ctx.error('cannot find the interface name:' + interacename, utils_2.PROVIDER_CONTEXT_STATUS.SERVICE_NOT_FOUND));
        if (!services[group][interacename][interfaceversion])
            return this.replyError(encoder, ctx.error('cannot find the interface version:' + interfaceversion, utils_2.PROVIDER_CONTEXT_STATUS.SERVICE_NOT_FOUND));
        ctx.interface = services[group][interacename][interfaceversion];
        if (!ctx.interface.serviceMethods.includes(ctx.method))
            return this.replyError(encoder, ctx.error('cannot find the interface version:' + interfaceversion, utils_2.PROVIDER_CONTEXT_STATUS.SERVER_TIMEOUT));
        Promise.resolve(this.sync('packet', ctx))
            .then(() => {
            if (!ctx.status)
                ctx.status = utils_2.PROVIDER_CONTEXT_STATUS.OK;
            this.socket.write(encoder.encode());
        })
            .catch((e) => {
            if (!e.code || !e.ctx)
                e = ctx.error(e.message, e.code || utils_2.PROVIDER_CONTEXT_STATUS.SERVICE_ERROR);
            this.replyError(encoder, e);
        });
    }
    replyError(encoder, err) {
        err.ctx.status = err.code;
        err.ctx.body = err.message;
        this.socket.write(encoder.encode());
    }
}
exports.default = Connection;
