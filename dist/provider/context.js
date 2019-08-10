"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ContextError extends Error {
}
exports.ContextError = ContextError;
class Context {
    constructor(app, json) {
        this.group = '-';
        this.attachments = {};
        this.app = app;
        this.requestId = json.requestId;
        this.dubboVersion = json.dubboVersion;
        this.interfaceName = json.interfaceName;
        this.interfaceVersion = json.interfaceVersion;
        this.method = json.method;
        this.parameters = json.parameters;
        if (json.attachments) {
            this.group = json.attachments.group || '-';
            this.timeout = json.attachments.timeout || 3000;
        }
    }
    error(msg, code) {
        const error = new ContextError(msg);
        error.code = code;
        error.ctx = this;
        return error;
    }
    throw(msg, code) {
        throw this.error(msg, code);
    }
}
exports.default = Context;
