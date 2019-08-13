/// <reference types="node" />
import * as url from 'url';
import * as net from 'net';
import Invoker from './invoker';
import { DecodeType } from './decoder';
export default class Channel {
    private _uri;
    private _client;
    active: number;
    private _id;
    private decoder;
    readonly app: Invoker;
    methods: string[];
    private timer;
    private _lastread_timestamp;
    private _lastwrite_timestamp;
    private callbacks;
    constructor(app: Invoker, options: url.UrlWithParsedQuery);
    private sendHeartbeat;
    resolve(options: url.UrlWithParsedQuery): void;
    close(): void;
    readonly host: string;
    lastread: number;
    readonly client: net.Socket;
    onMessage(json: DecodeType): void;
    connect(): Promise<void>;
    invoke(method: string, args: any[]): Promise<unknown>;
    retry(method: string, args: any[], time: number, times: number): Promise<unknown>;
}
