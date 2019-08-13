/// <reference types="node" />
declare type EncodeBody = {
    path?: string;
    requestId: number;
    dubboVersion: string;
    dubboInterface: string;
    version: string;
    methodName: string;
    methodArgs?: any[];
    group?: string;
    timeout?: number;
    application: string;
    attachments?: {
        [name: string]: any;
    };
};
export interface EncodeAttachments {
    [name: string]: any;
}
export default class Encoder {
    encode(options: EncodeBody): Buffer;
    setRequestId(requestId: number, header: Buffer): void;
    encodeHead(options: EncodeBody, payload: number): Buffer;
    encodeBody(options: EncodeBody): any;
    getParameterTypes(args: any[]): string;
    getAttachments(options: EncodeBody): {
        $class: string;
        $: {
            path: string;
            interface: string;
            version: string;
        } & {
            [name: string]: any;
        };
    };
}
export {};
