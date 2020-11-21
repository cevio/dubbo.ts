import { createServer } from 'net';
import { EventEmitter } from 'events';
import { Application } from '@dubbo.ts/application';
import { createProcessListener } from '@dubbo.ts/utils';
import { Connection } from './connection';

export class Provider extends EventEmitter {
  private readonly connections: Set<Connection> = new Set();
  private readonly tcp = createServer();
  private readonly listener = createProcessListener(
    () => this.close(),
    e => this.emit('error', e)
  );

  constructor(public readonly application: Application) {
    super();

    this.tcp.on('listening', () => this.emit('listening'));
    this.tcp.on('error', err => this.emit('error', err));
    this.tcp.on('close', () => this.emit('close'));
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

  public async listen(port: number) {
    await new Promise<void>((resolve, reject) => {
      this.tcp.listen(port, (err?: Error) => {
        if (err) return reject(err);
        resolve();
      })
    });
    this.listener.addProcessListener();
    return this.tcp;
  }

  public async close() {
    await Promise.all(
      Array.from(this.connections.values())
        .map(connection => connection.close())
    );
    await new Promise<void>((resolve, reject) => {
      this.tcp.close((err?) => {
        if (err) return reject(err);
        resolve();
      })
    });
  }
}