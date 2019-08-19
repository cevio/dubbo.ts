import * as zookeeper from 'node-zookeeper-client';
import { CREATE_MODES, RegistryInitOptions } from './utils';
export default class Registry {
    private readonly _host;
    private readonly _sessionTimeout;
    private readonly _spinDelay;
    private readonly _retries;
    private readonly _connectTimeout;
    private readonly _client;
    connected: boolean;
    constructor(options: RegistryInitOptions);
    connect(): Promise<unknown>;
    close(): void;
    exists(uri: string): Promise<unknown>;
    create(uri: string, mode: CREATE_MODES): Promise<unknown>;
    remove(uri: string): Promise<unknown>;
    children(path: string, watchlistener?: (event: zookeeper.Event) => void): Promise<string[]>;
}
