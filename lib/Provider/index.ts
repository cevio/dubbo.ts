import { createServer } from 'net';
import { TRegistry } from "../Registry/interface";
import { TProviderOptions, TServiceOptions } from "./interface";
import { Connection } from "./connection";
import { EventEmitter } from 'events';
import { Service } from "./service";
import { getServiceFinger } from '../finger';
import { createProcessListener } from '../process';
export class Provider<R extends TRegistry = any> extends EventEmitter {
  private readonly tcp = createServer();
  private readonly services: Map<string, Service<R>> = new Map();
  private readonly connections: Set<Connection<R>> = new Set();
  private readonly listener = createProcessListener(
    () => this.close(), 
    (e) => this.emit('error', e)
  );
  constructor(public readonly options: TProviderOptions<R>) {
    super();
    if (!this.options.pid) this.options.pid = process.pid;
    if (!this.options.heartbeat) this.options.heartbeat = 0;
    this.tcp.on('listening', () => this.emit('listening'));
    this.tcp.on('error', err => this.emit('error', err));
    this.tcp.on('connection', socket => {
      const connection = new Connection(this, socket);
      this.connections.add(connection);
    });
  }

  public addService(options: TServiceOptions) {
    const id = getServiceFinger({
      interface: options.interface,
      group: options.group,
      version: options.version,
    });
    if (!this.services.has(id)) {
      const service = new Service(this, options);
      this.services.set(id, service);
    }
    return this.services.get(id);
  }

  public deleteConnection(connection: Connection<R>) {
    if (this.connections.has(connection)) {
      this.connections.delete(connection);
    }
    return this;
  }

  public async launch() {
    this.options.registry && await this.options.registry.connect();
    await new Promise((resolve, reject) => {
      this.tcp.listen(this.options.port, (err?: Error) => {
        if (err) return reject(err);
        resolve();
      })
    });
    if (this.options.registry) {
      for (const [, service] of this.services) {
        await service.publish();
      }
    }
    this.listener.addProcessListener();
    return this.tcp;
  }

  public async close() {
    if (this.options.registry) {
      for (const [, service] of this.services) {
        await service.unpublish();
      }
      await this.options.registry.close();
    }
    await Promise.all(
      Array.from(this.connections.values())
        .map(connection => connection.close())
    );
    !this.listener.closing && await new Promise((resolve, reject) => {
      this.tcp.close((err?) => {
        if (err) return reject(err);
        resolve();
      })
    });
    this.emit('close');
  }
}