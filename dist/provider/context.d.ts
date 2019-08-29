/// <reference types="node" />
import Connection from './connection';
import { EventEmitter } from '@nelts/utils';
import { PROVIDER_CONTEXT_STATUS } from '../utils';
declare type StackCallback = () => Promise<any>;
export default class Context extends EventEmitter {
    private _stacks;
    private _stackStatus;
    private data;
    private conn;
    private decoded;
    status: PROVIDER_CONTEXT_STATUS;
    body: any;
    attachments: {
        dubbo?: string;
        [name: string]: any;
    };
    req: {
        requestId: number;
        dubboVersion: string;
        interfaceName: string;
        interfaceVersion: string;
        method: string;
        parameters: any[];
        attachments: {
            path: string;
            interface: string;
            version: string;
            group?: string;
            timeout: number;
        };
    };
    constructor(conn: Connection, buf: Buffer);
    readonly logger: import("../utils").Logger;
    stash(fn: StackCallback): this;
    commit(): Promise<void>;
    rollback(e: Error): Promise<void>;
    decode(): Promise<void>;
    encode(): Buffer;
    setRequestId(header: Buffer): void;
    private encodeHead;
    private isSupportAttachments;
    private encodeBody;
}
export {};
