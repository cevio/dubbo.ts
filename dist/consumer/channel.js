"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const encode_1 = require("./encode");
const utils_1 = require("../utils");
const decoder_1 = require("./decoder");
class Channel {
    constructor(invoker) {
        this.busies = 0;
        this._lastread_timestamp = Date.now();
        this._lastwrite_timestamp = Date.now();
        this._rpc_callback_id = 0;
        this._rpc_callbacks = new Map();
        this.decoder = new decoder_1.default();
        this.invoker = invoker;
    }
    get host() {
        return this.service.host;
    }
    get href() {
        return this.service.href;
    }
    get retries() {
        return Number(this.service.query['default.retries']);
    }
    get timeout() {
        return Number(this.service.query['default.timeout']);
    }
    invoke(method, args) {
        if (!this.service.query.methods || !this.service.query.methods.split(',').includes(method)) {
            return Promise.resolve({
                code: 444,
                message: 'cannot find the method of ' + method,
            });
        }
        this.busies++;
        let id = this._rpc_callback_id++;
        if (id === Number.MAX_SAFE_INTEGER)
            id = 1;
        this.invoker.consumer.logger.debug('[Consumer Invoker]', this.service.host);
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this._rpc_callbacks.delete(id);
                this.busies--;
                resolve({
                    code: 408,
                    message: 'rpc invoke timeout:' + this.timeout,
                });
            }, this.timeout);
            this._rpc_callbacks.set(id, data => {
                clearTimeout(timer);
                this._rpc_callbacks.delete(id);
                this.busies--;
                resolve(data);
            });
            this.send(encode_1.default({
                requestId: id,
                dubboVersion: this.service.query.dubbo,
                dubboInterface: this.service.query.interface,
                version: this.service.query.version,
                methodName: method,
                methodArgs: args,
                group: this.service.query['default.group'],
                timeout: Number(this.service.query['default.timeout'] || 0),
                application: this.invoker.consumer.application,
            }));
        });
    }
    send(buf) {
        if (!this.alive)
            return;
        this.client.write(buf);
        this._lastwrite_timestamp = Date.now();
    }
    async reconnect() {
        await this.connect();
        this.bindEvents();
        this.setupHeartbeat();
        this.alive = true;
    }
    async connect() {
        this.client = net.createConnection({ port: Number(this.service.port), host: this.service.hostname });
        await new Promise((resolve, reject) => {
            const errorListener = (err) => {
                this.client.removeListener('error', errorListener);
                reject(err);
            };
            this.client.on('error', errorListener);
            this.client.once('ready', () => {
                this.client.removeListener('error', errorListener);
                resolve();
            });
        });
    }
    bindEvents() {
        this.client.on('data', (buf) => this.onMessage(buf));
        this.client.on('error', err => this.invoker.consumer.logger.fatal(err));
        this.client.on('close', () => {
            this.invoker.consumer.logger.debug('  %', this.href);
            return this.uninstall();
        });
    }
    setupHeartbeat() {
        const heartbeat = Number(this.service.query.heartbeat || 0);
        const heartbeat_timeout = heartbeat * 3;
        if (heartbeat > 0) {
            this._heartbeat_timer = setInterval(() => {
                const time = Date.now();
                const readTime = time - this._lastread_timestamp;
                const writeTime = time - this._lastwrite_timestamp;
                if (readTime > heartbeat_timeout || writeTime > heartbeat_timeout) {
                    return (async () => {
                        await this.uninstall();
                        await this.install(this.service);
                    })().catch(e => {
                        this.invoker.consumer.logger.fatal(e);
                        return this.uninstall();
                    });
                }
                if (readTime > heartbeat || writeTime > heartbeat)
                    return this.send(utils_1.heartBeatEncode());
            }, heartbeat);
        }
    }
    onMessage(buf) {
        this._lastread_timestamp = Date.now();
        this.decoder.receive(this, buf, ({ err, res, requestId, attachments, }) => {
            const fn = this._rpc_callbacks.has(requestId) ? this._rpc_callbacks.get(requestId) : null;
            if (fn) {
                if (err)
                    return fn({
                        code: 500,
                        message: err.message,
                    });
                return fn({
                    code: 200,
                    data: res,
                });
            }
        });
    }
    close() {
        if (!this.alive)
            return;
        clearInterval(this._heartbeat_timer);
        this._heartbeat_timer = null;
        this.client.destroy();
    }
    async install(one) {
        this.setup(one);
        await this.reconnect();
    }
    async uninstall() {
        this.close();
        this.alive = false;
        await this.invoker.remove(this);
    }
    async setup(one) {
        this.service = one;
    }
}
exports.default = Channel;
