# dubbo.ts

Dubbo官网 [http://dubbo.apache.org](http://dubbo.apache.org)，它主要解决java服务的RPC通信问题，而`dubbo.ts`主要参考Dubbo理念，重写在NODEJS端的dubbo的rpc通信。它提供一整套完整的包括从服务端到客户端的解决方案。

作者参考了现有市面上的所有基于nodejs的dubbo框架，发现这些框架都只实现了客户端调用服务端的解决方案，而没有实现在nodejs上如何启动dubbo的RPC通讯的解决方案。`dubbo.ts`应运而生，作者参考了大量java的源码，相似度接近90%，对于一般企业使用dubbo的rpc通讯绰绰有余。

> `dubbo.ts` 采用 `typescript` 编写。

## Get started

让我们一起来看看如何使用这个框架。

### Install

```bash
$ npm i dubbo.ts
```

### Usage

```ts
import { Registry, Provider, Consumer } from 'dubbo.ts';
```

#### Registry

基于zookeeper的服务注册发现。使用来第三方的库 [node-zookeeper-client](https://www.npmjs.com/package/node-zookeeper-client)

> This module is designed to resemble the ZooKeeper Java client API but with tweaks to follow the convention of Node.js modules. Developers that are familiar with the ZooKeeper Java client would be able to pick it up quickly.

创建一个新的registry

```ts
const registry = new Registry({
  host: '127.0.0.1:2181'
} as RegistryInitOptions);
await registry.connect();
registry.close();
```

Registry的初始化参数

```ts
export type RegistryInitOptions = {
  host: string, // zookeeper 地址.
  sessionTimeout?: number, // Session timeout in milliseconds, defaults to 30 seconds.
  spinDelay?: number, // The delay (in milliseconds) between each connection attempts.
  retries?: number, //  The number of retry attempts for connection loss exception.
  connectTimeout?: number, // zookeeper 连接超时时间（毫秒）
}
```

初始化完毕后需要连接

```ts
await registry.connect();
```

关闭连接

```ts
registry.close();
```

> 一般的，在`provider`或者`Consumer`中您无需关心什么时候连接，市面时候关闭，系统将自动处理。而你只要 `new Registry()`即可。

#### Provider

Dubbo的服务提供者，主要用于提供RPC通讯服务。

```ts
class CUATOM_SERVICE {
  hello() {
    return 123;
  }
}
// 创建对象
const provider = new Provider({
  application: 'test',
  dubbo_version: '2.0.2',
  port: 8080,
  pid: process.pid,
  registry: registry,
  heartbeat?: 60000,
} as ProviderInitOptions);
// 添加服务
// addService(service: any, configs: ProviderServiceChunkInitOptions)
provider.addService(CUATOM_SERVICE, {
  interface: 'xxx',
  version: 'x.x.x',
  group; 'xxxx',
  methods: ['xxx', 'ddd'],
  timeout: 3000
} as ProviderServiceChunkInitOptions);
provider.addService(...);
provider.addService(...);

// 监听服务
await provider.listen();

// 关闭服务
await provider.close();
```

Provider初始化参数

```ts
type ProviderInitOptions = {
  application: string; // 应用名
  root?: string; // 在zookeeper上路径的root名
  dubbo_version: string; // dubbo版本
  port: number; // 服务端口
  pid: number; // 服务进程ID
  registry?: Registry; // Registry对象
  heartbeat?: number; // 心跳频率，如果不指定，那么不进行心跳。
  heartbeatTimeout?: number; // 基于心跳的心跳超时时间
  logger?: Logger; // 日志对象
}
```

addService参数

```ts
type ProviderServiceChunkInitOptions = {
    interface: string; // 接口名
    revision?: string; // 接口修订版本，不指定默认为version值
    version?: string; // 版本
    group?: string; // 组
    methods: string[]; // 方法列表
    delay?: number; // 延迟调用时间（毫秒） 默认 -1 不延迟
    retries?: number; // 超时尝试次数 默认2次
    timeout?: number; // 请求超时时间 默认 3000ms
}
```

通过`listen`方法启动服务后，我们可以通过事件`data`来获取反序列化后的数据

```ts
import { ProviderContext, ProviderChunk, PROVIDER_CONTEXT_STATUS } from 'dubbo.ts';
provider.on('data', async (ctx: ProviderContext, chunk: ProviderChunk) => {
  // 反序列化数据
  const req = ctx.req;
  // 如果chunk.interfacetarget是一个class service
  // 那么我们可以这样写
  const app = new chunk.interfacetarget();
  const result = app[req.method](...req.parameters);
  ctx.body = result;
  ctx.status = PROVIDER_CONTEXT_STATUS.OK;
})
```

# License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2019-present, yunjie (Evio) shen
