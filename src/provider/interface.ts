export type InterfaceOptions = {
  interface: string,
  revision?: string,
  version?: string,
  group?: string,
  methods: string[],
  delay?: number,
  retries?: number,
  timeout?: number,
  target?: any,
}

export type InterfaceConfigs = Omit<InterfaceOptions, 'target'>;

export default class Interface {
  public readonly serviceInterface: string;
  public readonly serviceVersion: string;
  public readonly serviceGroup: string;
  public readonly serviceRevision: string;
  public readonly serviceMethods: string[] = [];
  public readonly serviceDefaultDeplay: number;
  public readonly serviceDefaultRetries: number;
  public readonly serviceDefaultTimeout: number;
  public readonly Constructor: any;
  constructor(options: InterfaceOptions) {
    this.serviceInterface = options.interface;
    this.serviceVersion = options.version || '0.0.0';
    this.serviceGroup = options.group;
    this.serviceDefaultDeplay = options.delay || -1;
    this.serviceDefaultRetries = options.retries || 2;
    this.serviceDefaultTimeout = options.timeout || 3000;
    this.serviceRevision = options.revision || this.serviceVersion;
    this.Constructor = options.target;
    if (options.methods && Array.isArray(options.methods) && options.methods.length) {
      this.serviceMethods = options.methods;
    }
  }
}