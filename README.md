# dubbo.ts

`dubbo.ts`提供完整的服务端和客户端整套解决方案。

## Registry

主要使用`zookeeper`来发现注册服务。

## Server

服务端主要作为服务提供者，提供以下功能：

1. [provider] 服务注册
2. [decode] 处理客户端发送来的数据进行自定义处理
3. [encode] 加工处理后的数据响应到客户端

同时它又可以作为消费者，调用其他微服务。

## Consumer

客户端主要作为消费者，提供以下功能：

1. [consumer] 服务注册
2. [encode] 发送数据到服务提供者
3. [decode] 接受数据并且自处理

# Install

```bash
npm i dubbo.ts
```

# Usage

主要讲解以下几个方面：

- Registry
- Provider
- Consumer

## Registry

```ts
import { Registry, RegistryOptions } from 'dubbo.ts';

const registry = new Registry({ host: '127.0.0.1:2181', ... } as RegistryOptions);
await registry.connect(); // 连接zookeeper
registry.destory(); // 断开zookeeper连接
```

## Provider

服务提供者。首先我们需要收集所有服务，并且通过`publish`方法注册到`zookeeper`上

```ts
import { Provider, ProviderOptions, ProviderContext, PROVIDER_CONTEXT_STATUS } from 'dubbo.ts';
class CUSTOM_SERVICE {};
const provider = new Provider({
  application: 'test',
  dubbo_version: '2.5.3',
  port: 8080,
  pid: process.pid,
  registry: registry,
} as ProviderOptions);

// 添加一个服务
provider.addService({
  interface: 'com.xxx.xxx.xxx',
  version: '1.0.0',
  methods: ['home', 'hello', ...],
  target: CUSTOM_SERVICE
});

await provider.publish(); // 注册到zookeeper
await provider.unPublish(); // 解注所有服务

// 请求及响应
provider.on('packet', async (ctx: ProviderContext) => {
  // 您可以通过ctx参数进行自定义处理。
  const structor = ctx.interface.Constructor;
  const a = new structor();
  ctx.status = PROVIDER_CONTEXT_STATUS.OK;
  ctx.body = await a[ctx.method](...ctx.parameters);
})
```

## Consumer

暂无

# License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2019-present, yunjie (Evio) shen
