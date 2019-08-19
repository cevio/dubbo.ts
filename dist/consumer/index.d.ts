import { ConsumerServiceInitOptions, Logger } from "../utils";
import Registry from "../registry";
import Invoker from './invoker';
export default class Consumer {
    readonly application: string;
    readonly root: string;
    readonly version: string;
    readonly registry: Registry;
    readonly pid: number;
    readonly logger: Logger;
    readonly pick_timeout: number;
    private readonly storage;
    constructor(options: ConsumerServiceInitOptions);
    get(interfacename: string, version?: string, group?: string): Promise<Invoker>;
    close(): Promise<void>;
    listen(): Promise<void>;
}
