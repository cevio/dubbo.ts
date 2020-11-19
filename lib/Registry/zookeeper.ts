import { TRegistry, TRegistryOptions } from "./interface";
import { Client, createClient, CreateMode } from 'node-zookeeper-client';
import { localhost } from '../utils';
export class Registry implements TRegistry {
  private readonly client: Client;
  constructor(public readonly options: TRegistryOptions = {}) {
    if (!this.options.dubboRootName) this.options.dubboRootName = 'dubbo';
    if (!this.options.dubboVersion) this.options.dubboVersion = '2.0.2';
    if (!this.options.host) this.options.host = localhost;
    this.client = createClient(this.options.host, {
      sessionTimeout: options.sessionTimeout || 30000,
      spinDelay: options.spinDelay || 1000,
      retries: options.retries || 0,
    });
  }

  connect() {
    return new Promise(resolve => {
      this.client.once('connected', resolve);
      this.client.connect();
    });
  }

  close() {
    return new Promise(resolve => {
      this.client.close();
      resolve();
    });
  }

  exists(uri: string) {
    return new Promise<boolean>((resolve, reject) => {
      this.client.exists(uri, (err, stat) => {
        if (err) return reject(err);
        return resolve(!!stat);
      });
    });
  }

  public async create(url: string) {
    const sp = url.split('/');
    let path: string = '';
    for (let i = 1; i < sp.length; i++) {
      path = path + '/' + sp[i];
      const mode = i === sp.length - 1 
        ? CreateMode.EPHEMERAL 
        : CreateMode.PERSISTENT;
      await this._create(path, mode);
    }
  }

  private async _create(uri: string, mode: number) {
    if (!(await this.exists(uri))) {
      return await new Promise<string>((resolve, reject) => {
        this.client.create(uri, mode, (err, node) => {
          if (err) return reject(err);
          resolve(node);
        })
      })
    }
  }

  async remove(uri: string) {
    if (await this.exists(uri)) {
      return await new Promise<void>((resolve, reject) => {
        this.client.remove(uri, err => {
          if (err) return reject(err);
          resolve();
        })
      })
    }
  }
}