/// <reference types="node" />
import * as net from 'net';
import { EventEmitter } from '@nelts/utils';
import Registry from '../registry';
import Interface, { InterfaceOptions } from './interface';
declare type ProviderLogger = {
    error(...args: any[]): void;
};
export declare type ProviderOptions = {
    application: string;
    root?: string;
    dubbo_version: string;
    port: number;
    pid: number;
    registry: Registry;
    heartbeat?: number;
    heartbeatTimeout?: number;
    logger?: ProviderLogger;
};
export default class Provider extends EventEmitter {
    private readonly _application;
    private readonly _root;
    private readonly _version;
    private readonly _registry;
    private readonly _port;
    private readonly _pid;
    private readonly _heartbeat;
    private readonly _heartbeat_timeout;
    private readonly _logger;
    private _tcp;
    private _register_uris;
    private _services;
    private _conns;
    private readonly _services_map;
    constructor(options: ProviderOptions);
    readonly logger: ProviderLogger;
    readonly heartbeat: number;
    readonly heartbeatTimeout: number;
    readonly tcp: net.Server;
    readonly version: string;
    readonly services: {
        [group: string]: {
            [interfacename: string]: {
                [version: string]: Interface;
            };
        };
    };
    addService(data: InterfaceOptions): this;
    connect(socket: net.Socket): void;
    publish(): Promise<this>;
    unPublish(): Promise<unknown[]>;
    destroy(): Promise<void>;
    listen(port: number, ...args: any[]): void;
    close(callback?: (err?: Error) => void): void;
}
export {};
