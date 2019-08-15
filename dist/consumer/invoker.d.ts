/// <reference types="node" />
import * as url from 'url';
import Consumer from './index';
import { EventEmitter } from '@nelts/utils';
export default class Invoker extends EventEmitter {
    readonly app: Consumer;
    private _interfacename;
    private _version;
    private _group;
    private _checking;
    private _services;
    constructor(app: Consumer, interfacename: string, version: string, group: string);
    close(): void;
    readonly interface: string;
    readonly version: string;
    readonly group: string;
    readonly checking: boolean;
    check(uris: url.UrlWithParsedQuery[]): Promise<[this[], void, void[]]>;
    private resolveCommonChannel;
    private addNewChannel;
    private removeOldChannel;
    push(configs: url.UrlWithParsedQuery): Promise<this>;
    private pick;
    invoke<T = any>(method: string, args: any[]): Promise<T>;
}
