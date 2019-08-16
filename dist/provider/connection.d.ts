/// <reference types="node" />
import * as net from 'net';
import Provider from './index';
import { EventEmitter } from '@nelts/utils';
export default class Connection extends EventEmitter {
    private app;
    socket: net.Socket;
    private timer;
    private _lastread_timestamp;
    private _lastwrite_timestamp;
    constructor(app: Provider, socket: net.Socket);
    lastread: number;
    lastwrite: number;
    updateWrite(): void;
    updateRead(): void;
    private sendHeartbeat;
    destroy(): Promise<void>;
    private onMessage;
    private replyError;
}
