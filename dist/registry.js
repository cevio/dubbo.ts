"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zookeeper = require("node-zookeeper-client");
class Registry {
    constructor(options) {
        this.connected = false;
        this._host = options.host;
        this._sessionTimeout = options.sessionTimeout || 30000;
        this._spinDelay = options.spinDelay || 1000;
        this._retries = options.retries || 5;
        this._connectTimeout = options.connectTimeout || 10000;
        this._client = zookeeper.createClient(this._host, {
            sessionTimeout: this._sessionTimeout,
            spinDelay: this._spinDelay,
            retries: this._retries,
        });
    }
    connect() {
        return new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                try {
                    this.close();
                }
                catch (e) { }
                ;
                reject(new Error('FATAL: It seems that zookeeper cannot be connected, please check registry address or try later.'));
            }, this._connectTimeout);
            this._client.once('connected', () => {
                clearTimeout(timer);
                this.connected = true;
                resolve();
            });
            this._client.connect();
        });
    }
    close() {
        this._client.close();
        this.connected = false;
    }
    exists(uri) {
        return new Promise((resolve, reject) => {
            this._client.exists(uri, (err, stat) => {
                if (err)
                    return reject(err);
                return resolve(!!stat);
            });
        });
    }
    async create(uri, mode) {
        if (!(await this.exists(uri))) {
            return await new Promise((resolve, reject) => {
                this._client.create(uri, mode, (err, node) => {
                    if (err)
                        return reject(err);
                    resolve(node);
                });
            });
        }
    }
    async remove(uri) {
        if (await this.exists(uri)) {
            return await new Promise((resolve, reject) => {
                this._client.remove(uri, err => {
                    if (err)
                        return reject(err);
                    resolve();
                });
            });
        }
    }
    children(path, watchlistener) {
        return new Promise((resolve, reject) => {
            const callback = (err, children, stat) => {
                if (err)
                    return reject(err);
                if (stat)
                    return resolve(children);
                return reject(new Error('cannot find zookeeper path:' + path));
            };
            if (watchlistener) {
                this._client.getChildren(path, watchlistener, callback);
            }
            else {
                this._client.getChildren(path, callback);
            }
        });
    }
}
exports.default = Registry;
