/// <reference types="node" />
import Channel from './channel';
export default function decode(channel: Channel, data: Buffer, callback: (options: {
    err: Error;
    res: any;
    requestId: number;
    attachments: {
        [name: string]: any;
    };
}) => void): void;
