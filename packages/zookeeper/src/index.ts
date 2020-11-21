import { TRegistry, Application } from '@dubbo.ts/application';
import { Client, createClient, CreateMode } from 'node-zookeeper-client';
import { localhost } from '@dubbo.ts/utils';
export interface TZooKeeperOptions {
  host: string,
  sessionTimeout?: number,
  spinDelay?: number,
  retries?: number,
}
export class ZooKeeper implements TRegistry {
  private readonly zookeeper: Client;
  constructor(private readonly application: Application, options: TZooKeeperOptions = { host: localhost }) {
    this.zookeeper = createClient(options.host, {
      sessionTimeout: options.sessionTimeout || 30000,
      spinDelay: options.spinDelay || 1000,
      retries: options.retries || 0,
    });
  }

  public connect() {
    return new Promise<void>(resolve => {
      this.zookeeper.once('connected', resolve);
      this.zookeeper.connect();
    });
  }

  public close() {
    return new Promise<void>(resolve => {
      this.zookeeper.close();
      resolve();
    });
  }

  private exists(uri: string) {
    return new Promise<boolean>((resolve, reject) => {
      this.zookeeper.exists(uri, (err, stat) => {
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
        this.zookeeper.create(uri, mode, (err, node) => {
          if (err) return reject(err);
          resolve(node);
        })
      })
    }
  }

  public async remove(uri: string) {
    if (await this.exists(uri)) {
      return await new Promise<void>((resolve, reject) => {
        this.zookeeper.remove(uri, err => {
          if (err) return reject(err);
          resolve();
        })
      })
    }
  }

  public async query(url: string) {
    return [''];
  }
}