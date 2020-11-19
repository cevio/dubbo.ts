export class Attachment {
  static readonly DUBBO_VERSION_KEY = 'dubbo';
  static readonly PATH_KEY = 'path';
  static readonly VERSION_KEY = 'version';
  static readonly GROUP_KEYT = 'group';
  static readonly CLUSTER_KEY = 'cluster';
  static readonly SIDE_KEY = 'side';
  static readonly METHODS_KEY = 'methods';
  static readonly PID_KEY = 'pid';
  static readonly MONITOR_KEY = 'monitor';
  static readonly CHECK_KEY = 'check';
  static readonly INTERFACE_KEY = 'interface';
  static readonly TIMEOUT_KEY = 'timeout';
  static readonly REVISION_KEY = 'revision';
  static readonly RETRIES_KEY = 'retries';
  static readonly APPLICATION_KEY = 'application';
  static readonly DEFAULT_SERVICE_FILTER_KEY = 'default.service.filter';
  static readonly DEFAULT_REFERENCE_FILTER_KEY = 'default.reference.filter';
  static readonly ANYHOST_KEY = 'anyhost';
  static readonly REGISTER_KEY = 'register';
  static readonly TIMESTAMP_KEY = 'timestamp';

  private _method: string;
  private _argumentType: string;
  private _argumentData: any[] = [];
  private readonly storage: Map<keyof TAttchments, string> = new Map();

  public setMethodName(value: string) {
    this._method = value;
    return this;
  }

  public getMethodName() {
    return this._method;
  }

  public getParameterType() {
    return this._argumentType;
  }

  public getParameters() {
    return this._argumentData;
  }

  public setAttachment<T extends keyof TAttchments>(key: T, value: any) {
    if (typeof value === 'boolean') value = value ? 'true' : 'false';
    if (typeof value === 'number') value = String(value);
    if (Array.isArray(value)) value = value.join(',');
    this.storage.set(key, value as string);
    return this;
  }

  public getAttachment<T extends keyof TAttchments>(key: T, defaultValue?: any) {
    return this.storage.has(key) 
      ? this.storage.get(key) 
      : defaultValue;
  }

  public getAttachments() {
    const values: Record<string, any> = {};
    for (const [key, value] of this.storage) {
      values[key] = value;
    }
    return values;
  }

  public setParameters(value: any[]) {
    this._argumentData = value;
    this._argumentType = this.getParameterTypes(value);
    return this;
  }

  private getParameterTypes(args: any[]) {
    if (!(args && args.length))  return '';
    const primitiveTypeRef: any = {
      void: 'V',
      boolean: 'Z',
      byte: 'B',
      char: 'C',
      double: 'D',
      float: 'F',
      int: 'I',
      long: 'J',
      short: 'S',
    };
    const desc = [];
    for (let arg of args) {
      let type = arg['$class'];
      if (type[0] === '[') {
        desc.push('[');
        type = type.slice(1);
      }
      if (primitiveTypeRef[type]) {
        desc.push(primitiveTypeRef[type]);
      }
      else {
        desc.push('L');
        desc.push(type.replace(/\./gi, '/'));
        desc.push(';');
      }
    }
    return desc.join('');
  }
}

export interface TAttchments {
  [Attachment.DUBBO_VERSION_KEY]?: string;
  [Attachment.PATH_KEY]?: string;
  [Attachment.VERSION_KEY]: string;
  [Attachment.PID_KEY]?: number;
  [Attachment.INTERFACE_KEY]: string;
  [Attachment.APPLICATION_KEY]?: string;
  [Attachment.TIMESTAMP_KEY]?: number;

  [Attachment.GROUP_KEYT]?: string;
  [Attachment.CLUSTER_KEY]?: string;
  [Attachment.SIDE_KEY]?: string;
  [Attachment.METHODS_KEY]?: string;
  [Attachment.MONITOR_KEY]?: string;
  [Attachment.CHECK_KEY]?: boolean;
  [Attachment.TIMEOUT_KEY]?: number;
  [Attachment.REVISION_KEY]?: string;
  [Attachment.RETRIES_KEY]?: number;
  [Attachment.DEFAULT_SERVICE_FILTER_KEY]?: string[];
  [Attachment.DEFAULT_REFERENCE_FILTER_KEY]?: string[];
  [Attachment.ANYHOST_KEY]?: boolean;
  [Attachment.REGISTER_KEY]?: string;
}