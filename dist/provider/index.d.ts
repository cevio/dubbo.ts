/// <reference types="node" />
import * as net from 'net';
import { EventEmitter } from '@nelts/utils';
import Registry from '../registry';
import Interface, { InterfaceOptions } from './interface';
export declare type ProviderOptions = {
    application: string;
    root?: string;
    dubbo_version: string;
    port: number;
    pid: number;
    registry: Registry;
};
export default class Provider extends EventEmitter {
    private readonly _application;
    private readonly _root;
    private readonly _version;
    private readonly _registry;
    private readonly _port;
    private readonly _pid;
    private _register_uris;
    private _services;
    private readonly _services_map;
    constructor(options: ProviderOptions);
    readonly version: string;
    readonly services: {
        [group: string]: {
            [interfacename: string]: {
                [version: string]: Interface;
            };
        };
    };
    addService(data: InterfaceOptions): this;
    connection(socket: net.Socket): Promise<void>;
    publish(): Promise<this>;
    unPublish(): Promise<unknown[]>;
}
