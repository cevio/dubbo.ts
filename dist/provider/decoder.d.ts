/// <reference types="node" />
export declare type DecodeType = {
    requestId: number;
    dubboVersion: string;
    interfaceName: string;
    interfaceVersion: string;
    method: string;
    parameters: any[];
    status?: 20 | 30 | 31 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
    body?: any;
    flag?: 0 | 1 | 2 | 3 | 4 | 5;
    attachments: {
        path: string;
        interface: string;
        version: string;
        group?: string;
        timeout: number;
    };
};
export default class Decoder {
    private _buffer;
    private _subscriber;
    constructor();
    clearBuffer(): void;
    subscribe(subscriber: (json: DecodeType) => any): this;
    receive(data: Buffer): void;
    private dispatch;
}
