import { EventEmitter } from '@nelts/utils';
import Registry from '../registry';
import Invoker from './invoker';
import * as zookeeper from 'node-zookeeper-client';
declare type ConsumerLogger = {
    error(...args: any[]): void;
};
export declare type ConsumerOptions = {
    application: string;
    root?: string;
    dubbo_version: string;
    pid: number;
    registry: Registry;
    heartbeat?: number;
    heartbeatTimeout?: number;
    logger?: ConsumerLogger;
};
export default class Consumers extends EventEmitter {
    private readonly _application;
    private readonly _root;
    private readonly _version;
    private readonly _registry;
    private readonly _pid;
    private readonly _logger;
    private readonly _heartbeat;
    private readonly _heartbeat_timeout;
    private readonly _services;
    private _uris;
    constructor(options: ConsumerOptions);
    readonly logger: ConsumerLogger;
    readonly version: string;
    readonly application: string;
    readonly root: string;
    readonly heartbeat: number;
    readonly heartbeatTimeout: number;
    close(callback: Function): void;
    whenServiceChange(id: string, event: zookeeper.Event): void | Promise<void>;
    private NODE_CREATED;
    private NODE_DELETED;
    private NODE_DATA_CHANGED;
    private NODE_CHILDREN_CHANGED;
    create(interfacename: string, version?: string, group?: string): Promise<Invoker>;
}
export {};
