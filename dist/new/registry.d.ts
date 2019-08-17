import { CREATE_MODES, RegistryInitOptions } from './utils';
export default class Registry {
    private readonly _host;
    private readonly _sessionTimeout;
    private readonly _spinDelay;
    private readonly _retries;
    private readonly _connectTimeout;
    private readonly _client;
    constructor(options: RegistryInitOptions);
    connect(): Promise<unknown>;
    close(): void;
    exists(uri: string): Promise<unknown>;
    create(uri: string, mode: CREATE_MODES): Promise<unknown>;
    remove(uri: string): Promise<unknown>;
}
