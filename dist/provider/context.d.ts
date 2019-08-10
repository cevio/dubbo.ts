import { DecodeType } from './decoder';
import { PROVIDER_CONTEXT_STATUS } from '../utils';
import Connection from './connection';
import { EncodeAttachments } from './encoder';
import Interface from './interface';
export declare class ContextError extends Error {
    code: PROVIDER_CONTEXT_STATUS;
    ctx: Context;
}
export default class Context {
    readonly app: Connection;
    readonly requestId: number;
    readonly dubboVersion: string;
    readonly interfaceName: string;
    readonly interfaceVersion: string;
    readonly method: string;
    readonly parameters: any[];
    readonly group: string;
    readonly timeout: number;
    attachments: EncodeAttachments;
    status: PROVIDER_CONTEXT_STATUS;
    body: any;
    interface: Interface;
    constructor(app: Connection, json: DecodeType);
    error(msg: string, code: PROVIDER_CONTEXT_STATUS): ContextError;
    throw(msg: string, code?: PROVIDER_CONTEXT_STATUS): void;
}
