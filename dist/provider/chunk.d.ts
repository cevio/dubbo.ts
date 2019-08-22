import Provider from './index';
import { ProviderServiceChunkInitOptions, ProviderServiceChunkMethodParametersOptions } from '../utils';
export default class ServiceChunk<T = any> {
    private provider;
    readonly interfacename: string;
    readonly interfacegroup: string;
    readonly interfaceversion: string;
    readonly interfacerevision: string;
    readonly interfacemethods: string[];
    readonly interfacedelay: number;
    readonly interfaceretries: number;
    readonly interfacetimout: number;
    readonly interfacetarget: T;
    readonly interfacemethodparameters: ProviderServiceChunkMethodParametersOptions;
    readonly interfacedescription: string;
    private zooKeeperRegisterPath;
    constructor(provider: Provider, options: ProviderServiceChunkInitOptions);
    readonly id: string;
    setValue(value: T): void;
    register(): Promise<this>;
    unRegister(): Promise<unknown>;
}
