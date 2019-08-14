"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const channel_1 = require("./channel");
const utils_1 = require("@nelts/utils");
const intersect = require('@evio/intersect');
class Invoker extends utils_1.EventEmitter {
    constructor(app, interfacename, version, group) {
        super();
        this._checking = false;
        this._services = new Map();
        this.app = app;
        this._interfacename = interfacename;
        this._version = version;
        this._group = group;
    }
    close() {
        for (const [host, channel] of this._services)
            channel.close();
    }
    get interface() {
        return this._interfacename;
    }
    get version() {
        return this._version;
    }
    get group() {
        return this._group;
    }
    get checking() {
        return this._checking;
    }
    check(uris) {
        this._checking = true;
        const map = new Map();
        uris.forEach(uri => map.set(uri.host, uri));
        const oldKeys = Array.from(this._services.keys());
        const newKeys = Array.from(map.keys());
        const { adds, removes } = intersect(oldKeys, newKeys);
        return Promise.all([
            this.addNewChannel(adds.map(one => map.get(one))),
            this.removeOldChannel(removes)
        ]).finally(() => this._checking = false);
    }
    async addNewChannel(chunks) {
        return Promise.all(chunks.map(chunk => this.push(chunk)));
    }
    removeOldChannel(chunks) {
        chunks.forEach(chunk => {
            this._services.get(chunk).close();
            this._services.delete(chunk);
        });
    }
    async push(configs) {
        const channel = new channel_1.default(this, configs);
        await channel.connect();
        this._services.set(configs.host, channel);
        return this;
    }
    pick() {
        let _channel;
        for (const [name, channel] of this._services) {
            if (!_channel) {
                _channel = channel;
                continue;
            }
            if (channel.active < _channel.active) {
                _channel = channel;
            }
        }
        return _channel;
    }
    async invoke(method, args) {
        let _channel = this.pick();
        if (!_channel) {
            await new Promise((resolve, reject) => {
                const startTime = Date.now();
                const timer = setInterval(() => {
                    if (Date.now() - startTime > this.app.pickTimeout) {
                        clearInterval(timer);
                        return reject(new Error('rpc invoke timeout.'));
                    }
                    _channel = this.pick();
                    if (_channel) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 33.33);
            });
        }
        const methods = _channel.methods;
        if (!methods.includes(method))
            throw new Error('cannot find the method of ' + method);
        return (await _channel.invoke(method, args));
    }
}
exports.default = Invoker;
