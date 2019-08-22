/// <reference types="node" />
import Registry from './registry';
export declare const DUBBO_HEADER_LENGTH = 16;
export declare const DUBBO_MAGIC_HEADER = 55995;
export declare const FLAG_REQEUST = 128;
export declare const FLAG_TWOWAY = 64;
export declare const FLAG_EVENT = 32;
export declare const HESSIAN2_SERIALIZATION_CONTENT_ID = 2;
export declare const MAGIC_HIGH = 218;
export declare const MAGIC_LOW = 187;
export declare const DUBBO_DEFAULT_PAY_LOAD: number;
export declare type RPC_CALLBACK_ARGS = {
    code: number;
    data?: any;
    message?: string;
};
export declare type RPC_CALLBACK = (result: RPC_CALLBACK_ARGS) => void;
export declare type ConsumerEncodeBody = {
    path?: string;
    requestId: number;
    dubboVersion: string;
    dubboInterface: string;
    version: string;
    methodName: string;
    methodArgs?: any[];
    group?: string;
    timeout?: number;
    application: string;
    attachments?: {
        [name: string]: any;
    };
};
export declare type RegistryInitOptions = {
    host: string;
    sessionTimeout?: number;
    spinDelay?: number;
    retries?: number;
    connectTimeout?: number;
};
export declare enum CREATE_MODES {
    PERSISTENT = 0,
    PERSISTENT_SEQUENTIAL = 2,
    EPHEMERAL = 1,
    EPHEMERAL_SEQUENTIAL = 3
}
export declare const localhost: string;
export declare type Logger = {
    trace?(...args: any[]): void;
    debug?(...args: any[]): void;
    error(...args: any[]): void;
    info(...args: any[]): void;
    log(...args: any[]): void;
    fatal?(...args: any[]): void;
    warn(...args: any[]): void;
};
export declare type SwaggerBase64DataType = {
    description?: string;
    group?: string;
    version?: string;
    methods: ProviderServiceChunkMethodParametersOptions;
};
export declare type ProviderServiceChunkMethodParametersOptions = {
    [name: string]: {
        $class: string;
        $schema: any;
    }[];
};
export declare type ProviderServiceChunkInitOptions = {
    interface: string;
    revision?: string;
    version?: string;
    group?: string;
    methods: string[];
    delay?: number;
    retries?: number;
    timeout?: number;
    description?: string;
    parameters?: ProviderServiceChunkMethodParametersOptions;
};
export declare type ConsumerServiceInitOptions = {
    application: string;
    root?: string;
    dubbo_version: string;
    pid: number;
    registry?: Registry;
    logger?: Logger;
    pickTimeout?: number;
};
export declare type ProviderInitOptions = {
    application: string;
    root?: string;
    dubbo_version: string;
    port: number;
    pid: number;
    registry: Registry;
    heartbeat?: number;
    logger?: Logger;
};
export declare function getProviderServiceChunkId(interfacename: string, interfacegroup: string, interfaceversion: string): string;
export declare function heartBeatEncode(isReply?: boolean): Buffer;
export declare function toBytes4(num: number): Buffer;
export declare function fromBytes4(buf: Buffer): number;
export declare function toBytes8(num: number): Buffer;
export declare function fromBytes8(buf: Buffer): number;
export declare function isHeartBeat(buf: Buffer): boolean;
export declare function isReplyHeart(buf: Buffer): boolean;
export declare function getDubboArgumentLength(str: string): number;
export declare enum PROVIDER_CONTEXT_STATUS {
    OK = 20,
    CLIENT_TIMEOUT = 30,
    SERVER_TIMEOUT = 31,
    BAD_REQUEST = 40,
    BAD_RESPONSE = 50,
    SERVICE_NOT_FOUND = 60,
    SERVICE_ERROR = 70,
    SERVER_ERROR = 80,
    CLIENT_ERROR = 90,
    SERVER_THREADPOOL_EXHAUSTED = 100
}
export declare enum PROVIDER_RESPONSE_BODY_FLAG {
    RESPONSE_WITH_EXCEPTION = 0,
    RESPONSE_VALUE = 1,
    RESPONSE_NULL_VALUE = 2,
    RESPONSE_WITH_EXCEPTION_WITH_ATTACHMENTS = 3,
    RESPONSE_VALUE_WITH_ATTACHMENTS = 4,
    RESPONSE_NULL_VALUE_WITH_ATTACHMENTS = 5
}
