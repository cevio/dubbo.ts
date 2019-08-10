export declare type InterfaceOptions = {
    interface: string;
    revision?: string;
    version?: string;
    group?: string;
    methods: string[];
    delay?: number;
    retries?: number;
    timeout?: number;
    target?: any;
};
export declare type InterfaceConfigs = Omit<InterfaceOptions, 'target'>;
export default class Interface {
    readonly serviceInterface: string;
    readonly serviceVersion: string;
    readonly serviceGroup: string;
    readonly serviceRevision: string;
    readonly serviceMethods: string[];
    readonly serviceDefaultDeplay: number;
    readonly serviceDefaultRetries: number;
    readonly serviceDefaultTimeout: number;
    readonly Constructor: any;
    constructor(options: InterfaceOptions);
}
