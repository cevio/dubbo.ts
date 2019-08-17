/// <reference types="node" />
import * as net from 'net';
import Provider from './index';
export default class Connection {
    provider: Provider;
    private socket;
    private _alive;
    private _heartbet_timer;
    private _lastread_timestamp;
    private _lastwrite_timestamp;
    constructor(provider: Provider, socket: net.Socket);
    private connect;
    private initHeartbeat;
    onMessage(buf: Buffer): void;
    send(buf: Buffer): void;
    disconnect(): void;
}
