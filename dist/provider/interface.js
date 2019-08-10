"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Interface {
    constructor(options) {
        this.serviceMethods = [];
        this.serviceInterface = options.interface;
        this.serviceVersion = options.version || '0.0.0';
        this.serviceGroup = options.group;
        this.serviceDefaultDeplay = options.delay || -1;
        this.serviceDefaultRetries = options.retries || 2;
        this.serviceDefaultTimeout = options.timeout || 3000;
        this.serviceRevision = options.revision || this.serviceVersion;
        this.Constructor = options.target;
        if (options.methods && Array.isArray(options.methods) && options.methods.length) {
            this.serviceMethods = options.methods;
        }
    }
}
exports.default = Interface;
