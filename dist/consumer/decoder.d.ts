/// <reference types="node" />
import Channel from './channel';
export default class Decoder {
    private buf;
    receive(channel: Channel, data: Buffer, callback: (options: {
        err: Error;
        res: any;
        requestId: number;
        attachments: {
            [name: string]: any;
        };
    }) => void): void;
}
