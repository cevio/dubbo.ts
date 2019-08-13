/// <reference types="node" />
import Channel from './channel';
export declare type DecodeType = {
    err: Error;
    res: any;
    requestId: number;
    attachments?: {
        path?: string;
        interface?: string;
        version?: string;
        group?: string;
        timeout?: number;
    };
};
export default class Decoder {
    private _buffer;
    private _subscriber;
    readonly app: Channel;
    constructor(app: Channel);
    clearBuffer(): void;
    subscribe(subscriber: (json: DecodeType) => any): this;
    receive(data: Buffer): void;
    private dispatch;
}
