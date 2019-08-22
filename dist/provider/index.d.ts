import Registry from '../registry';
import { Logger, ProviderInitOptions, ProviderServiceChunkInitOptions } from '../utils';
import Chunk from './chunk';
import Connection from './connection';
import { EventEmitter } from '@nelts/utils';
export default class Provider extends EventEmitter {
    private tcp;
    readonly application: string;
    readonly root: string;
    readonly version: string;
    readonly port: number;
    readonly pid: number;
    readonly logger: Logger;
    readonly registry: Registry;
    readonly heartbeat: number;
    readonly heartbeat_timeout: number;
    readonly storage: Map<string, Chunk>;
    private connections;
    constructor(options: ProviderInitOptions);
    error(method: string, message: string): Error;
    addService(value: any, key: ProviderServiceChunkInitOptions): this;
    private publish;
    private unPublish;
    private connect;
    getChunkById(id: string): Chunk<any>;
    disconnect(conn: Connection): void;
    close(): Promise<void>;
    listen(): Promise<void>;
}
