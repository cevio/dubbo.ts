/// <reference types="node" />
import * as net from 'net';
import Provider from './index';
import { EventEmitter } from '@nelts/utils';
export default class Connection extends EventEmitter {
    private app;
    private socket;
    constructor(app: Provider, socket: net.Socket);
    private onMessage;
    private replyError;
}
