import { createServer } from 'net';
import { EventEmitter } from 'events';
import { Application } from '@dubbo.ts/application';
import { Events } from '@dubbo.ts/utils';
import { Connection } from './connection';

export type TPoviderEvents = { mounted: [], unmounted: [] };

export class Provider<E extends TPoviderEvents = TPoviderEvents> extends EventEmitter {
  private readonly connections: Set<Connection<E>> = new Set();
  private readonly tcp = createServer();
  public readonly lifecycle = new Events<E>();

  constructor(public readonly application: Application) {
    super();
    this.application.on('unmounted', () => this.close())
    this.tcp.on('listening', () => this.emit('listening'));
    this.tcp.on('error', err => this.emit('error', err));
    this.tcp.on('close', () => this.emit('close'));
    this.tcp.on('connection', socket => {
      const connection = new Connection<E>(this, socket);
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
    this.application.notify();
    await this.application.onProviderConnect();
    await this.lifecycle.emitAsync('mounted');
    return this.tcp;
  }

  public async close() {
    await this.application.onProviderDisconnect();
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
    await this.lifecycle.emitAsync('unmounted');
  }
}