"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chunk_1 = require("./chunk");
const net = require("net");
const connection_1 = require("./connection");
const utils_1 = require("@nelts/utils");
class Provider extends utils_1.EventEmitter {
    constructor(options) {
        super();
        this.storage = new Map();
        this.connections = [];
        this.application = options.application;
        this.root = options.root || 'dubbo';
        this.version = options.dubbo_version;
        this.port = options.port;
        this.pid = options.pid;
        this.logger = options.logger || console;
        this.registry = options.registry;
        this.heartbeat = options.heartbeat || 0;
        this.heartbeat_timeout = this.heartbeat * 3;
    }
    error(method, message) {
        return new Error(`[Provider Error] <Provider.${method}>: ${message}`);
    }
    addService(value, key) {
        const chunk = new chunk_1.default(this, key);
        if (this.storage.has(chunk.id))
            throw this.error('addService', 'chunk id is exists: ' + chunk.id);
        chunk.setValue(value);
        this.storage.set(chunk.id, chunk);
        return this;
    }
    async publish() {
        return await Promise.all(Array.from(this.storage.values()).map(chunk => chunk.register()));
    }
    async unPublish() {
        return await Promise.all(Array.from(this.storage.values()).map(chunk => chunk.unRegister()));
    }
    connect(socket) {
        const conn = new connection_1.default(this, socket);
        this.connections.push(conn);
    }
    getChunkById(id) {
        if (!this.storage.has(id))
            throw this.error('getChunkById', 'cannot find the service by id:' + id);
        return this.storage.get(id);
    }
    disconnect(conn) {
        const index = this.connections.indexOf(conn);
        if (index > -1) {
            this.connections.splice(index, 1);
            conn.disconnect();
        }
    }
    async close() {
        const connections = this.connections;
        this.connections = [];
        connections.forEach(conn => conn.disconnect());
        await this.unPublish();
        this.tcp.close();
        this.registry.close();
    }
    async listen() {
        if (!this.registry.connected)
            await this.registry.connect();
        this.tcp = net.createServer();
        this.tcp.on('connection', (socket) => this.connect(socket));
        await new Promise((resolve, reject) => {
            this.tcp.listen(this.port, (err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
        await this.publish();
    }
}
exports.default = Provider;
