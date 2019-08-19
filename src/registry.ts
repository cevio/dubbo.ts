import * as zookeeper from 'node-zookeeper-client';
import { CREATE_MODES, RegistryInitOptions } from './utils';

export default class Registry {
  private readonly _host: string;
  private readonly _sessionTimeout: number;
  private readonly _spinDelay: number;
  private readonly _retries: number;
  private readonly _connectTimeout: number;
  private readonly _client: zookeeper.Client;
  public connected: boolean = false;
  constructor(options: RegistryInitOptions) {
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
        try { this.close(); } catch(e) {};
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

  exists(uri: string) {
    return new Promise((resolve, reject) => {
      this._client.exists(uri, (err, stat) => {
        if (err) return reject(err);
        return resolve(!!stat);
      });
    });
  }

  async create(uri: string, mode: CREATE_MODES) {
    if (!(await this.exists(uri))) {
      return await new Promise((resolve, reject) => {
        this._client.create(uri, mode, (err, node) => {
          if (err) return reject(err);
          resolve(node);
        })
      })
    }
  }

  async remove(uri: string) {
    if (await this.exists(uri)) {
      return await new Promise((resolve, reject) => {
        this._client.remove(uri, err => {
          if (err) return reject(err);
          resolve();
        })
      })
    }
  }

  children(path: string, watchlistener?: (event: zookeeper.Event) => void): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const callback = (err: Error, children: string[], stat?: zookeeper.Stat) => {
        if (err) return reject(err);
        if (stat) return resolve(children);
        return reject(new Error('cannot find zookeeper path:' + path));
      };
      if (watchlistener) {
        this._client.getChildren(path, watchlistener, callback);
      } else {
        this._client.getChildren(path, callback);
      }
    })
  }
}