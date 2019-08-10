import { DecodeType } from './decoder';
import { PROVIDER_CONTEXT_STATUS } from '../utils';
import Connection from './connection';
import { EncodeAttachments } from './encoder';
import Interface from './interface';
export class ContextError extends Error {
  public code: PROVIDER_CONTEXT_STATUS;
  public ctx: Context;
}
export default class Context {
  public readonly app: Connection;
  public readonly requestId: number;
  public readonly dubboVersion: string;
  public readonly interfaceName: string;
  public readonly interfaceVersion: string;
  public readonly method: string;
  public readonly parameters: any[];
  public readonly group: string = '-';
  public readonly timeout: number;
  public attachments: EncodeAttachments = {};
  public status: PROVIDER_CONTEXT_STATUS;
  public body: any;
  public interface: Interface;
  constructor(app: Connection, json: DecodeType) {
    this.app = app;
    this.requestId = json.requestId;
    this.dubboVersion = json.dubboVersion;
    this.interfaceName = json.interfaceName;
    this.interfaceVersion = json.interfaceVersion;
    this.method = json.method;
    this.parameters = json.parameters;
    if (json.attachments) {
      this.group = json.attachments.group || '-';
      this.timeout = json.attachments.timeout || 3000;
    }
  }

  error(msg: string, code: PROVIDER_CONTEXT_STATUS) {
    const error = new ContextError(msg);
    error.code = code;
    error.ctx = this;
    return error;
  }

  throw(msg: string, code?: PROVIDER_CONTEXT_STATUS) {
    throw this.error(msg, code);
  }
}