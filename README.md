# dubbo.ts

一套高性能的nodejs端duboo协议架构。提供`provider`与`consumer`完整的通讯。

感兴趣的朋友请看演示: [dubbo.ts-example](https://github.com/cevio/dubbo.ts-example)

**支持的连接模式：**

- 直连模式
- 注册中心模式

## Packages

- [@dubbo.ts/application](https://npmjs.com/@dubbo.ts/application) 应用模块
- [@dubbo.ts/consumer](https://npmjs.com/@dubbo.ts/consumer) 消费者模块
- [@dubbo.ts/protocol](https://npmjs.com/@dubbo.ts/protocol) 协议模块
- [@dubbo.ts/provider](https://npmjs.com/@dubbo.ts/provider) 服务提供者模块
- [@dubbo.ts/utils](https://npmjs.com/@dubbo.ts/utils) 辅助函数模块
- [@dubbo.ts/zookeeper](https://npmjs.com/@dubbo.ts/zookeeper) ZooKeeper注册中心模块
- [@dubbo.ts/server](https://npmjs.com/@dubbo.ts/server) 注解式服务端写法模块
- [@dubbo.ts/swagger](https://npmjs.com/@dubbo.ts/swagger) 分布式swagger方案

## Performance

![dubbo performance](https://cdn.aidigger.com/Bumblebee/2020-12-19/ececbd1ca1392e9bc5beceb8ab01247d.png)

## Application

应用的全局参数管理模块，主要是对于当前应用参数的管理，防止参数重复定义。

```ts
import { Application } from '@dubbo.ts/application';
const app = new Application();
app.application = 'client';
app.version = '2.0.2';
app.timeout = 10000;
app.retries = 3;
app.heartbeat = 600000;
// ...
app.start();
```

参数定义如下：

| 参数名 | 类型 | 描述 | 默认值 | 必填 |
| ---   | --- | --- | ---   | --- |
| port | `number` | `Provider` 端TCP启动端口号 | `5000` | 是 |
| root | `string` | dubbo注册中心注册路径的起始字段名 | `dubbo` | 否 |
| verion | `string` | 当前dubbo服务的版本号 | `2.0.2` | 否 |
| cluster | `string` | 集群地址 | - | 否 |
| monitor | `string` | 监控平台地址路径 | - | 否 |
| timeout | `number` | 超时时间，单位毫秒(ms) | `20000` | 否 |
| application | `string` | 应用名称 | - | 是 |
| anyHost | `boolean` | 是否允许任意接入 | `true` | 否 |
| register | `boolean` | 是否为注册者 | `false` | 否 |
| heartbeat | `number` | 心跳频率，单位毫秒(ms) | `60000` | 否 |
| retries | `number` | 重试次数| `3` | 否 |

## Registry

注册中心，目前只支持`ZooKeeper`。需要其他注册中心，请根据文档编写对应的注册类。

```ts
import { ZooKeeper } from '@dubbo.ts/zookeeper';
const registry = new ZooKeeper(app, {
  host: '127.0.0.1'
});
app.useRegistry(registry);
```

`ZooKeeper`目前采用的库是 [node-zookeeper-client](https://www.npmjs.com/package/node-zookeeper-client)。除`host`参数指定注册中心地址外，其他参数参考[这里](https://www.npmjs.com/package/node-zookeeper-client#client-createclientconnectionstring-options)。

上报信息:

```ts
/**
 * registry.addService(
 *   interface: string, 
 *   methods: string[], 
 *   configs?: { version?: string, group?: string }
 * )
 */
registry.addProviderService('com.mifa.stib.factory', ['use']);
```

调用远程方法

```ts
/**
 * interface: string, 
 * method: string, 
 * args: any[],
 * configs?: { version?: string, group?: string }
 */
const client = await registry.invoke(interface, configs);
const result = await client.execute(interface, method, args, configs);
```

`registry.invoke`主要是用来从注册中心查询资源后得到`host`与`port`来实例化一个直连的clinent对象。它不会重复创建实例，而是缓存已有的实例。不必担心每次调用都是实例化的问题。

`registry.invoke`的`interface`与 `client.execute` 的 `interface` 是同一个，这样做仅仅是 `consumer.invoke` 来获取注册中心的资源，而`client.execute`才是真正执行的参数。

注意: `args`参数必须是一个特定的解构，可以通过[js-to-java](https://npmjs.com/js-to-java)查看使用。


```ts
const java = require('js-to-java');
const args = [java.combine('com.mifa.stib.common.RpcData', {
    data: {"name":"gxh","age":"18","word":""},
    headers: {
      appName: 'dist',
      platform: 1,
      equipment: 1,
    },
    user: {
      id: 1
    },
  }
)];
```

### Registry Filter

自定义zookeeper资源的匹配规则，返回一个布尔值。

```ts
registry.addFilter((uri: UrlWithParsedQuery) => {
   // ...
   return true || false;
})
```

## Provider

提供服务模块。

```ts
import { Connection, Provider } from '@dubbo.ts/provider';
const provider = new Provider(app);
app.useProvider(provider);
provider.on('connect', async () => console.log(' + [Provider]', 'client connected'));
provider.on('disconnect', async () => console.log(' - [Provider]', 'client disconnect'));
provider.on('error', async (e) => console.error(' x [provider]', e));
provider.on('start', async () => console.log(' @ [Provider]', 'started'));
provider.on('stop', async () => console.log(' @ [Provider]', 'stoped'));
provider.on('heartbeat', async () => console.log(' @ [heartbeat]', '[provider]', 'send'));
provider.on('heartbeat:timeout', async () => console.log(' @ [heartbeat]', '[provider]', 'timeout'))
provider.on('data', (reply) => {
  reply(async (schema, status) => {
    return {
      status: status.OK,
      data: {
        value: 'ok'
      }
    }
  })
})
app.start();
```

### Provider Events

事件如下:

- `connect` 客户端连接时候触发该事件，接受一个`connection`参数为连接参数。
  ```ts
  import { Connection } from '@dubbo.ts/provider';
  provider.on('connect', (connection: Connection) => {});
  ```
- `disconnect` 客户端丢失连接时候触发该事件，接受一个`connection`参数为连接参数。
  ```ts
  import { Connection } from '@dubbo.ts/provider';
  provider.on('disconnect', (connection: Connection) => {});
  ```
- `error` 服务出错触发该事件，接受一个错误对象。
  ```ts
  provider.on('error', (e) => console.error(e));
  ```
- `start` 服务启动。
  ```ts
  provider.on('start', () => console.log('start'));
  ```
- `stop` 服务停止。
  ```ts
  provider.on('stop', () => console.log('stop'));
  ```
- `heartbeat` 发送心跳。
  ```ts
  provider.on('heartbeat', () => console.log('heartbeat'));
  ```
- `heartbeat:timeout` 心跳超时。
  ```ts
  provider.on('heartbeat:timeout', () => console.log('heartbeat:timeout'));
  ```
- `data` 处理由客户端传入数据的事件，也是核心事件。通过这个事件可以对当前传入参数做自定义处理。参数为一个reply，主要用于对数据返回处理的一个包裹函数。
  ```ts
  import { Connection } from '@dubbo.ts/provider';
  provider.on('data', (reply) => {
    reply(async (schema, status) => {
      /**
       * schema 参数如下:
       * isTwoWay: boolean;
       * id: number;
       * dubbo_version: string;
       * interface: string;
       * version: string;
       * method: string;
       * parameters: any[];
       * attachments: Record<string, string>;
       * 注意:返回数据格式必须如下。status是状态 data为具体数据。
       */
      return {
        status: status.OK,
        data: {
          value: 'ok'
        }
      }
    })
  })
  ```

## Consumer

消费者模块，用来调用服务方数据。

```ts
import { Consumer } from '@dubbo.ts/consumer';
const consumer = new Consumer(app);
app.useConsumer(consumer);
consumer.on('start', async () => console.log(' + [consumer]', 'started'))
consumer.on('stop', async () => console.log(' - [consumer]', 'stoped'))
consumer.on('disconnect', async () => console.log(' - [consumer]', 'server disconnect'));
consumer.on('connect', async () => console.log(' + [consumer]', 'server connected'));
consumer.on('reconnect', async (index, conn) => console.log(' # [consumer]', index + 'times connecting...', conn.id));
consumer.on('error', async e => console.error(' ! [consumer]', e));
consumer.on('channels', async result => console.log(' $ [consumer]', result.map((res: any) => res.host)));
consumer.on('heartbeat', async () => console.log(' @ [heartbeat]', '[consumer]', 'send'))
consumer.on('heartbeat:timeout', async () => console.log(' @ [heartbeat]', '[consumer]', 'timeout'));
app.start();
```

### Consumer Connect

直连模式

```ts
// consumer.connect(host: string, port: number)
const client = consumer.connect('127.0.0.1', 8081);
const result = await client.execute(interface, method, args, configs);
```

注册中心见registry中的invoke函数。


### Consumer Events

事件：

- `connect` 连接上服务器后触发该事件，接受一个`Channel`参数为连接参数。
  ```ts
  import { Channel } from '@dubbo.ts/consumer';
  consumer.on('connect', (channel: Channel) => {});
  ```
- `disconnect` 服务器丢失连接触发该事件，接受一个`Channel`参数为连接参数。
  ```ts
  import { Channel } from '@dubbo.ts/consumer';
  consumer.on('disconnect', (channel: Channel) => {});
  ```
- `reconnect` 与服务端发生重连的事件 index:第n次连接
  ```ts
  import { Channel } from '@dubbo.ts/consumer';
  consumer.on('reconnect', (index: number, channel: Channel) => {});
  ```
- `error` 服务出错触发该事件，接受一个错误对象。
  ```ts
  consumer.on('error', (e) => console.error(e));
  ```
- `start` client启动。
  ```ts
  consumer.on('start', (e) => console.log('start'));
  ```
- `stop` client启动。
  ```ts
  consumer.on('stop', (e) => console.log('stop'));
  ```
- `channels` 当从注册中心获取到数据后触发该事件，参数为所有有效匹配解构的URL序列化对象。
  ```ts
  consumer.on('channels', result => console.log('get channels:', result.map((res: any) => res.host)));
  ```
- `heartbeat` 发送心跳。
  ```ts
  consumer.on('heartbeat', () => console.log('heartbeat'));
  ```
- `heartbeat:timeout` 心跳超时。
  ```ts
  consumer.on('heartbeat:timeout', () => console.log('heartbeat:timeout'));
  ```

## Annotation Server

结合IOC理念,我们使用`inversify`来解构我们的开发,从而产生了基于注解式的服务写法,类似java中的注解写法,以便开发者能够快速开发应用.

```ts
iimport { ZooKeeper } from '@dubbo.ts/zookeeper';
import { Server, Service, Proxy } from '@dubbo.ts/server';

@Service('Com.Node.Dubbo.Test')
class Test {
  @Proxy()
  public sum(a: number, b: number) {
    return a + b;
  }
}

const server = new Server();
const app = server.application;
const provider = server.provider;
const consumer = server.consumer;
const registry = new ZooKeeper(app, { host: '127.0.0.1' });
app.application = '测试';
app.port = 6000;
app.heartbeat = 3000;
app.useRegistry(registry);
server.addService(Test);

provider.on('connect', async () => console.log(' + [Provider]', 'client connected'));
provider.on('disconnect', async () => console.log(' - [Provider]', 'client disconnect'));
provider.on('error', async (e) => console.error(' x [provider]', e));
provider.on('start', async () => console.log(' @ [Provider]', 'started'));
provider.on('stop', async () => console.log(' @ [Provider]', 'stoped'));
provider.on('heartbeat', async () => console.log(' @ [heartbeat]', '[provider]', 'send'));
provider.on('heartbeat:timeout', async () => console.log(' @ [heartbeat]', '[provider]', 'timeout'))

consumer.on('start', async () => console.log(' + [consumer]', 'started'))
consumer.on('stop', async () => console.log(' - [consumer]', 'stoped'))
consumer.on('disconnect', async () => console.log(' - [consumer]', 'server disconnect'));
consumer.on('connect', async () => console.log(' + [consumer]', 'server connected'));
consumer.on('reconnect', async () => console.log(' # [consumer]', 'server reconnected'));
consumer.on('error', async e => console.error(' ! [consumer]', e));
consumer.on('channels', async result => console.log(' $ [consumer]', result.map((res: any) => res.host)));
consumer.on('heartbeat', async () => console.log(' @ [heartbeat]', '[consumer]', 'send'))
consumer.on('heartbeat:timeout', async () => console.log(' @ [heartbeat]', '[consumer]', 'timeout'));

registry.on('start', async () => console.log(' + [registry]', 'started'));
registry.on('stop', async () => console.log(' - [registry]', 'stoped'));
registry.on('node:create', async node => console.log(' + [registry]', 'create node:', node));
registry.on('node:remove', async node => console.log(' - [registry]', 'remove node:', node));

// server.on('runtime:before', async (schema, { target, method }) => console.log(' + [server]', schema))

server.listen().then(() => {
  console.log(' - Tcp server on', 'port:', app.port);
});
```

> 只有被`@Proxy()`标记过的函数才能被微服务调用.因为我们本来就应该考虑只有公共函数才被调用,而私有函数肯定不希望被调用.通过这个注解我们可以达到这个目的.

## Swagger

通过注册中心,我们创建了一套分布式的swagger机制.

```ts
import { Application } from '@dubbo.ts/application';
import { Server, Service, Proxy } from '@dubbo.ts/server';
import { ZooKeeper } from '@dubbo.ts/zookeeper';
import { Description, InputSchema, OutputSchema, useSwagger } from '@dubbo.ts/swagger';

@Service('Com.Node.Dubbo.Test')
@Description('Test demo')
class Test {
  @Proxy()
  @OutputSchema({
    type: 'integer',
    description: 'test method for sum'
  })
  public sum(
    @InputSchema({ type: 'integer', description: 'parameter 1' }) a: number, 
    @InputSchema({ type: 'integer', description: 'parameter 2' }) b: number
  ) {
    return a + b;
  }
}

const server = new Server();
const app = server.application;
const provider = server.provider;
const consumer = server.consumer;
const registry = new ZooKeeper(app, { host: '127.0.0.1' });
app.application = '测试';
app.port = 6000;
app.heartbeat = 3000;
app.useRegistry(registry);

useSwagger(server); // 注意: useSwagger必须写在server.addService之前

server.addService(Test);

server.listen().then(() => {
  console.log(' - Tcp server on', 'port:', app.port);
});
```

一共有3个注解:

- `@Description(value: string)` 描述这个类的文案,仅对class生效
- `@OutputSchema(schema: JSONSchema)` 描述这个方法的输出内容结构,仅对method生效
- `@InputSchema(schema: JSONSchema)` 描述这个参数的输入内容结构,仅对parameter生效

> 注意: `JSONSchema`: `import { JSONSchema } from 'json-schema-typed';`

**查询资源:**

```ts
import { queryRegistry } from '@dubbo.ts/swagger';
// interface:
queryRegistry(
  regsitry: TRegistry, // registry: app.registry
  group: string = '*', 
  interface?: string, 
  version?: string
): string[];
```

**解析资源:**

```ts
import { queryRegistry, parse, TSwaggerObject } from '@dubbo.ts/swagger';
// interface:
parse(str: string): TSwaggerObject;

// 只有当版本号资源获取以后才可以用这个方法,否则报错
// registry: app.registry
const value = await queryRegistry(registry, '*', 'Com.Node.Dubbo.Test', '0.0.0');
value.forEach(str => console.log(parse(str));
//
```