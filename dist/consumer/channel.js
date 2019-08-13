"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const encoder_1 = require("./encoder");
const utils_1 = require("../utils");
const decoder_1 = require("./decoder");
class Channel {
    constructor(app, options) {
        this.active = 0;
        this._id = 1;
        this.methods = [];
        this._lastread_timestamp = 0;
        this._lastwrite_timestamp = 0;
        this.callbacks = new Map();
        this.app = app;
        this.decoder = new decoder_1.default(this);
        this.decoder.subscribe(this.onMessage.bind(this));
        this.resolve(options);
    }
    sendHeartbeat() {
        if (this.app.checking)
            return;
        this._client.write(utils_1.heartBeatEncode());
        this._lastwrite_timestamp = Date.now();
    }
    resolve(options) {
        this._uri = options;
        this.methods = [];
        if (this._uri.query.methods) {
            this.methods.push(...this._uri.query.methods.split(','));
        }
    }
    close() {
        clearInterval(this.timer);
        this.timer = null;
        if (this._client) {
            this._client.destroy();
            delete this._client;
        }
    }
    get host() {
        return this._uri.host;
    }
    set lastread(value) {
        this._lastread_timestamp = value;
    }
    get lastread() {
        return this._lastread_timestamp;
    }
    get client() {
        return this._client;
    }
    onMessage(json) {
        const id = json.requestId;
        if (this.callbacks.has(id)) {
            const fn = this.callbacks.get(id);
            this.callbacks.delete(id);
            fn(json.err, json.res, json.attachments);
        }
    }
    async connect() {
        this._client = net.createConnection({ port: Number(this._uri.port), host: this._uri.hostname });
        await new Promise((resolve, reject) => {
            const errorListener = (err) => {
                this._client.removeListener('error', errorListener);
                reject(err);
            };
            this._client.on('error', errorListener);
            this._client.once('ready', () => {
                this._client.removeListener('error', errorListener);
                resolve();
            });
        });
        this._client.on('data', buf => this.decoder.receive(buf));
        this._client.on('error', (err) => this.app.app.logger.error(err));
        this._client.on('close', () => this.close());
        const heartbeat = this.app.app.heartbeat;
        const heartbeat_timeout = this.app.app.heartbeatTimeout;
        this.timer = setInterval(() => {
            const time = Date.now();
            if ((this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat_timeout) ||
                (this._lastwrite_timestamp > 0 && time - this._lastwrite_timestamp > heartbeat_timeout)) {
                this.close();
                this.connect();
            }
            if ((this._lastread_timestamp > 0 && time - this._lastread_timestamp > heartbeat) ||
                (this._lastwrite_timestamp && time - this._lastwrite_timestamp > heartbeat)) {
                this.sendHeartbeat();
            }
        }, heartbeat);
        this.sendHeartbeat();
    }
    async invoke(method, args) {
        console.log(this.host);
        if (!this._client)
            await this.connect();
        this.active++;
        const retries = Number(this._uri.query.retries || 2);
        return await this.retry(method, args, 1, retries).finally(() => this.active--);
    }
    async retry(method, args, time, times) {
        const encoder = new encoder_1.default();
        const id = this._id++;
        const json = {
            requestId: id,
            dubboVersion: this.app.app.version,
            dubboInterface: this.app.interface,
            version: this.app.version,
            methodName: method,
            methodArgs: args,
            group: this.app.group,
            timeout: Number(this._uri.query['default.timeout'] || 3000),
            application: this.app.app.application,
        };
        const buf = encoder.encode(json);
        this._client.write(buf);
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.callbacks.delete(id);
                if (time < times)
                    return resolve(this.retry(method, args, time + 1, times));
                return reject(new Error('timeout:' + json.timeout));
            }, json.timeout);
            this.callbacks.set(id, (err, data, attachments) => {
                clearTimeout(timer);
                this.callbacks.delete(id);
                if (err)
                    return reject(err);
                resolve({ data, attachments });
            });
        });
    }
}
exports.default = Channel;
