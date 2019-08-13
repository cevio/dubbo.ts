/// <reference types="node" />
import { InterfaceConfigs as ProviderInterfaceOptions } from './provider/interface';
import Registry from './registry';
export declare enum CREATE_MODES {
    PERSISTENT = 0,
    PERSISTENT_SEQUENTIAL = 2,
    EPHEMERAL = 1,
    EPHEMERAL_SEQUENTIAL = 3
}
export declare type ConsumerInterfaceOptions = {
    interface: string;
    version?: string;
    group?: string;
};
export declare function ConsumerRegisterUri(root: string, host: string, application: string, dubboversion: string, pid: number, options: ConsumerInterfaceOptions): {
    interface_root_path: string;
    interface_dir_path: string;
    interface_entry_path: string;
};
export declare function ProviderRegisterUri(root: string, host: string, application: string, dubboversion: string, pid: number, heartbeat: number, options: ProviderInterfaceOptions): {
    interface_root_path: string;
    interface_dir_path: string;
    interface_entry_path: string;
};
export declare function isLoopback(addr: string): boolean;
export declare function ip(): string;
export declare function zookeeperCreateNode(registry: Registry, uri: string, mode: CREATE_MODES): Promise<unknown>;
export declare function zookeeperRemoveNode(registry: Registry, uri: string): Promise<unknown>;
export declare function zookeeperExistsNode(registry: Registry, uri: string): Promise<unknown>;
export declare function toBytes4(num: number): Buffer;
export declare function fromBytes4(buf: Buffer): number;
export declare function toBytes8(num: number): Buffer;
export declare function fromBytes8(buf: Buffer): number;
export declare function heartBeatEncode(isReply?: boolean): Buffer;
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
