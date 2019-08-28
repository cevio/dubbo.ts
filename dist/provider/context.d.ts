/// <reference types="node" />
import Connection from './connection';
import { EventEmitter } from '@nelts/utils';
import { PROVIDER_CONTEXT_STATUS } from '../utils';
export default class Context extends EventEmitter {
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
    decode(): Promise<void>;
    encode(): Buffer;
    setRequestId(header: Buffer): void;
    private encodeHead;
    private isSupportAttachments;
    private encodeBody;
}
