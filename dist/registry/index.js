"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@nelts/utils");
const zookeeper = require("node-zookeeper-client");
class Registry extends utils_1.EventEmitter {
    constructor(options) {
        super();
        this._host = options.host;
        this._sessionTimeout = options.sessionTimeout || 30000;
        this._spinDelay = options.spinDelay || 1000;
        this._retries = options.retries || 5;
        this._connectTimeout = options.connectTimeout || 10000;
        this._zk = zookeeper.createClient(this._host, {
            sessionTimeout: this._sessionTimeout,
            spinDelay: this._spinDelay,
            retries: this._retries,
        });
    }
    get zk() {
        return this._zk;
    }
    connect() {
        return new Promise((resolve, reject) => {
            let timer = setTimeout(() => {
                try {
                    this.destory();
                }
                catch (e) { }
                ;
                reject(new Error('FATAL: It seems that zookeeper cannot be connected, please check registry address or try later.'));
            }, this._connectTimeout);
            this._zk.once('connected', () => {
                clearTimeout(timer);
                resolve();
            });
            this._zk.connect();
        });
    }
    destory() {
        this._zk.close();
    }
}
exports.default = Registry;
