/// <reference types="node" />
import * as url from 'url';
import Invoker from './invoker';
import { RPC_CALLBACK_ARGS } from '../utils';
export default class Channel {
    readonly invoker: Invoker;
    private client;
    private service;
    alive: boolean;
    busies: number;
    private _lastread_timestamp;
    private _lastwrite_timestamp;
    private _heartbeat_timer;
    private _rpc_callback_id;
    private _rpc_callbacks;
    private readonly decoder;
    constructor(invoker: Invoker);
    readonly host: string;
    readonly href: string;
    readonly retries: number;
    readonly timeout: number;
    invoke(method: string, args: any[]): PromiseLike<RPC_CALLBACK_ARGS>;
    send(buf: Buffer): void;
    reconnect(): Promise<void>;
    private connect;
    private bindEvents;
    private setupHeartbeat;
    onMessage(buf: Buffer): void;
    private close;
    install(one: url.UrlWithParsedQuery): Promise<void>;
    uninstall(): Promise<void>;
    setup(one: url.UrlWithParsedQuery): Promise<void>;
}
