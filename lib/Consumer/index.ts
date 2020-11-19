import { TConsumerOptions } from "./interface";
import { EventEmitter } from 'events';
import { TRegistry } from '../Registry/interface';
import { Client } from './client';
import { getClientFinger } from "../finger";
import { createProcessListener } from "../process";
export class Consumer<R extends TRegistry> extends EventEmitter {
  private readonly clients: Map<string, Client<R>> = new Map();
  private readonly listener = createProcessListener(
    () => this.close(),
    (e) => this.emit('error', e)
  );
  constructor(public readonly options: TConsumerOptions<R>) {
    super();
    if (!this.options.timeout) this.options.timeout = 3000;
    if (!this.options.pid) this.options.pid = process.pid;
    if (!this.options.heartbeat) this.options.heartbeat = 0;
  }

  public async launch() {
    this.options.registry && await this.options.registry.connect();
    this.listener.addProcessListener();
  }

  public deleteClient(client: Client<R>) {
    if (this.clients.has(client.id)) {
      this.clients.delete(client.id);
    }
  }

  async connect(host: string, port: number) {
    const id = getClientFinger(host, port);
    if (!this.clients.has(id)) {
      const client = new Client(this, host, port);
      this.clients.set(client.id, client);
      await client.connect();
    }
    return this.clients.get(id);
  }

  async close() {
    const pools: Promise<void>[] = [];
    for (const [, client] of this.clients) {
      pools.push(client.close());
    }
    await Promise.all(pools);
    if (this.options.registry) {
      await this.options.registry.close();
    }
  }
}