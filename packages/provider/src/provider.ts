import { createServer } from 'net';
import { Application, TProvider, TProviderBaseEvents } from '@dubbo.ts/application';
import { Events } from '@dubbo.ts/utils';
import { Connection, TProviderReply } from './connection';

export type TProviderEvents = TProviderBaseEvents & {
  connect: [Connection],
  disconnect: [Connection],
  error: [Error],
  data: [TProviderReply],
  ['heartbeat']: [],
  ['heartbeat:timeout']: [],
}

export class Provider extends Events<TProviderEvents> implements TProvider<TProviderEvents> {
  private readonly connections: Set<Connection> = new Set();
  private readonly tcp = createServer();
  private activeShutdown = false;

  constructor(public readonly application: Application) {
    super();
    // 将启动与关闭流程注册到Application统一管理
    this.application.on('unmounted', () => this.close());
    this.application.on('mounted', () => this.listen());
    this.on('error', async err => console.error(err));

    this.tcp.on('error', err => this.emit('error', err));
    this.tcp.on('close', () => {
      if (!this.activeShutdown) {
        // 如果是被动关闭tcp连接
        // 首先需要将现有的子连接关闭
        // 再退出进程
        this.closeActiveConnections()
          .then(() => this.emitAsync('stop'))
          .catch(e => this.emitAsync('error', e))
          .finally(() => process.nextTick(() => process.exit(0)));
      }
    });
    this.tcp.on('connection', socket => {
      const connection = new Connection(this, socket);
      this.connections.add(connection);
      this.emit('connect', connection);
      socket.on('close', () => {
        connection.close(true).then(() => {
          this.connections.delete(connection);
          this.emit('disconnect', connection);
        });
      })
    });
  }

  public async listen() {
    await new Promise<void>((resolve, reject) => {
      this.tcp.listen(this.application.port, (err?: Error) => {
        if (err) return reject(err);
        resolve();
      })
    });
    await this.emitAsync('start');
  }

  private async closeActiveConnections() {
    if (this.connections.size) {
      await Promise.all(
        Array.from(this.connections.values())
          .map(connection => connection.close())
      );
      this.connections.clear();
    }
  }

  public async close() {
    this.activeShutdown = true;
    await this.closeActiveConnections();
    await new Promise<void>((resolve, reject) => {
      this.tcp.close((err?) => {
        if (err) return reject(err);
        resolve();
      })
    });
    await this.emitAsync('stop');
  }
}