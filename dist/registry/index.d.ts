import { EventEmitter } from '@nelts/utils';
import * as zookeeper from 'node-zookeeper-client';
export declare type RegistryOptions = {
    host: string;
    sessionTimeout?: number;
    spinDelay?: number;
    retries?: number;
    connectTimeout?: number;
};
export default class Registry extends EventEmitter {
    private readonly _host;
    private readonly _sessionTimeout;
    private readonly _spinDelay;
    private readonly _retries;
    private readonly _connectTimeout;
    private readonly _zk;
    constructor(options: RegistryOptions);
    readonly zk: zookeeper.Client;
    connect(): Promise<unknown>;
    destory(): void;
}
