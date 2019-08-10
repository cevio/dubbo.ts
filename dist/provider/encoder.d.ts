/// <reference types="node" />
import Context from './context';
export interface EncodeAttachments {
    [name: string]: any;
}
export default class Encoder {
    private ctx;
    constructor(ctx: Context);
    encode(): Buffer;
    setRequestId(header: Buffer): void;
    encodeHead(payload: number): Buffer;
    encodeBody(): any;
}
