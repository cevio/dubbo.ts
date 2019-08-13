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
import { Registry, Provider, ProviderContext, PROVIDER_CONTEXT_STATUS } from 'dubbo.ts';

class CUSTOM_SERVICE {
  hello(a: number, b: number) {
    return a + b;
  }
}

const registry = new Registry({
  host: '192.168.2.208:2181',
});

const provider = new Provider({
  application: 'test',
  dubbo_version: '2.0.2',
  port: 8080,
  pid: process.pid,
  registry
});

process.on('SIGINT', () => {
  let closed = false;
  provider.close(() => {
    closed = true;
  });
  setInterval(() => {
    if (closed) {
      console.log('closed')
      process.exit(0);
    }
  }, 300);
});

provider.on('packet', async (ctx: ProviderContext) => {
  const structor = ctx.interface.Constructor;
  const a = new structor();
  ctx.status = PROVIDER_CONTEXT_STATUS.OK;
  ctx.body = await a[ctx.method](...ctx.parameters);
});

provider.addService({
  interface: 'com.mifa.test',
  version: '1.0.0',
  methods: ['hello'],
  target: CUSTOM_SERVICE
});

(async () => {
  await registry.connect();
  await provider.listen(8080, () => console.log('server start at 8080'));
})().then(() => console.log('service published')).catch(e => console.error(e));
```

## Consumer

消费者。用来连接服务提供者获取rpc数据。

```ts
import { Registry, Consumer } from 'dubbo.ts';
import * as http from 'http';
const java = require('js-to-java');

const registry = new Registry({
  host: '192.168.2.208:2181',
});

const consumer = new Consumer({
  application: 'dist',
  dubbo_version: '2.0.2',
  pid: process.pid,
  registry: registry,
  heartbeat: 3000,
});

process.on('SIGINT', () => {
  let closed = false;
  consumer.close(() => {
    closed = true;
  });
  setInterval(() => {
    if (closed) {
      console.log('closed')
      process.exit(0);
    }
  }, 300);
});


(async () => {
  await registry.connect();
  await new Promise((resolve) => {
    http.createServer((req, res) => {
      (async () => {
        const invoker = await consumer.create('com.mifa.test', '1.0.0');
        return await invoker.invoke('hello', [java.int(5), java.int(6)]);
      })().then((data: any) => res.end(JSON.stringify(data))).catch(e => {
        res.statusCode = 500;
        res.end(e.stack);
      });
    }).listen(9001, resolve)
  });
})().then(() => console.log('client connected')).catch(e => console.error(e));
```

# License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2019-present, yunjie (Evio) shen
