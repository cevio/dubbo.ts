"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const invoker_1 = require("./invoker");
class Consumer {
    constructor(options) {
        this.storage = new Map();
        this.application = options.application;
        this.root = options.root || 'dubbo';
        this.version = options.dubbo_version;
        this.registry = options.registry;
        this.pid = options.pid;
        this.logger = options.logger || console;
        this.pick_timeout = options.pickTimeout || 3000;
    }
    async get(interfacename, version, group) {
        group = group || '-';
        version = version || '0.0.0';
        const id = utils_1.getProviderServiceChunkId(interfacename, group, version);
        if (this.storage.has(id))
            return this.storage.get(id);
        const invoker = new invoker_1.default(this, interfacename, version, group);
        this.storage.set(id, invoker);
        await invoker.register();
        await invoker.subscribe(id);
        return invoker;
    }
    async close() {
        for (const [id, invoker] of this.storage) {
            await invoker.close();
        }
        this.registry.close();
    }
    async listen() {
        if (!this.registry.connected)
            await this.registry.connect();
    }
}
exports.default = Consumer;
