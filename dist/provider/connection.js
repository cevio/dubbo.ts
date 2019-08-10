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
        this.app = app;
        this.socket = socket;
        const decoder = new decoder_1.default();
        decoder.subscribe(this.onMessage.bind(this));
        socket.on('data', (data) => decoder.receive(data));
    }
    onMessage(json) {
        const ctx = new context_1.default(this, json);
        const encoder = new encoder_1.default(ctx);
        if (this.app.version !== ctx.dubboVersion)
            return this.replyError(encoder, ctx.error('unsupport dubbo version:' + json.dubboVersion, utils_2.PROVIDER_CONTEXT_STATUS.BAD_REQUEST));
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
