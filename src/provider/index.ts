import Registry from '../registry';
import { Logger, ProviderInitOptions, ProviderServiceChunkInitOptions } from '../utils';
import Chunk from './chunk';
import * as net from 'net';
import Connection from './connection';
import { EventEmitter } from '@nelts/utils';

export default class Provider extends EventEmitter {
  private tcp: net.Server;
  public readonly application: string;
  public readonly root: string;
  public readonly version: string;
  public readonly port: number;
  public readonly pid: number;
  public readonly logger: Logger;
  public readonly registry: Registry;
  public readonly heartbeat: number;
  public readonly heartbeat_timeout: number;
  private readonly storage: Map<string, Chunk> = new Map();
  private connections: Connection[] = [];
  constructor(options: ProviderInitOptions) {
    super();
    this.application = options.application;
    this.root = options.root || 'dubbo';
    this.version = options.dubbo_version;
    this.port = options.port;
    this.pid = options.pid;
    this.logger = options.logger || console;
    this.registry = options.registry;
    this.heartbeat = options.heartbeat || 0;
    this.heartbeat_timeout = this.heartbeat * 3;
  }

  error(method: string, message: string) {
    return new Error(`[Provider Error] <Provider.${method}>: ${message}`);
  }

  public addService(value: any, key: ProviderServiceChunkInitOptions) {
    const chunk = new Chunk(this, key);
    if (this.storage.has(chunk.id)) throw this.error('addService', 'chunk id is exists: ' + chunk.id);
    chunk.setValue(value);
    this.storage.set(chunk.id, chunk);
    return this;
  }

  private async publish() {
    return await Promise.all(Array.from(this.storage.values()).map(chunk => chunk.register()));
  }

  private async unPublish() {
    return await Promise.all(Array.from(this.storage.values()).map(chunk => chunk.unRegister()));
  }

  private connect(socket: net.Socket) {
    const conn = new Connection(this, socket);
    this.connections.push(conn);
  }

  getChunkById(id: string) {
    if (!this.storage.has(id)) throw this.error('getChunkById', 'cannot find the service by id:' + id);
    return this.storage.get(id);
  }

  disconnect(conn: Connection) {
    const index = this.connections.indexOf(conn);
    if (index > -1) {
      this.connections.splice(index, 1);
      conn.disconnect();
    }
  }

  public async close() {
    const connections = this.connections;
    this.connections = [];
    connections.forEach(conn => conn.disconnect());
    await this.unPublish();
    this.tcp.close();
    this.registry.close();
  }

  public async listen() {
    if (!this.registry.connected) await this.registry.connect();
    this.tcp = net.createServer();
    this.tcp.on('connection', (socket: net.Socket) => this.connect(socket));
    await new Promise((resolve, reject) => {
      this.tcp.listen(this.port, (err?: Error) => {
        if (err) return reject(err);
        resolve();
      })
    })
    await this.publish();
  }
}