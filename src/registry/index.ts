import { EventEmitter } from '@nelts/utils';
import * as zookeeper from 'node-zookeeper-client';

export type RegistryOptions = {
  host: string,
  sessionTimeout?: number,
  spinDelay?: number,
  retries?: number,
  connectTimeout?: number,
}

export default class Registry extends EventEmitter {
  private readonly _host: string;
  private readonly _sessionTimeout: number;
  private readonly _spinDelay: number;
  private readonly _retries: number;
  private readonly _connectTimeout: number;
  private readonly _zk: zookeeper.Client;
  constructor(options: RegistryOptions) {
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
        try { this.destory(); } catch(e) {};
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