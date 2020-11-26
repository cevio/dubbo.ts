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

## Performance

![dubbo performance](https://cdn.aidigger.com/Bumblebee/2020-11-22/c50ca1eb29a1fad7e19da5b05564dcdd.png)

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
registry.addService('com.mifa.stib.factory', ['use']);
```

### Custom Match

自定义zookeeper资源的匹配规则，返回一个布尔值。

```ts
import { Attachment } from '@dubbo.ts/protocol';
registry.setChannelMatcher((uri, options) => {
  const interfaceMatched = uri.query[Attachment.INTERFACE_KEY] === options.interface || uri.query[Attachment.PATH_KEY] === options.interface;
  const groupMatched = options.group === '*' ? true : (uri.query[Attachment.GROUP_KEY] === options.group);
  const versionMatched = options.version === '0.0.0' ? true : uri.query[Attachment.VERSION_KEY] === options.version;
  if (interfaceMatched && groupMatched && versionMatched) return true;
  return false;
})
```

## Provider

提供服务模块。

```ts
import { Connection, Provider } from '@dubbo.ts/provider';
const provider = new Provider(app);
provider.on('connect', () => console.log('client connected'));
provider.on('disconnect', () => console.log('client disconnect'))
provider.on('listening', () => console.log(' - Tcp connection is listening'));
provider.on('error', (e) => console.error(e));
provider.on('close', () => console.log('\n - Tcp closed'));
provider.on('data', (reply: ReturnType<Connection['createExecution']>) => {
  reply(async (schema, status) => {
    return {
      status: status.OK,
      data: {
        value: 'ok'
      }
    }
  })
})
provider.listen().then(tcp => {
  console.log(' - Tcp server on', 'port:', 8081, 'status:', tcp.listening);
});
```

### Provider.listen

启动服务。它是一个`Promise`，没有任何参数。启动的端口，它将自动从`application`中获取。

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
- `listening` TCP连接正在启动的时候触发该事件。
  ```ts
  provider.on('listening', () => console.log(' - Tcp connection is listening'));
  ```
- `error` 服务出错触发该事件，接受一个错误对象。
  ```ts
  provider.on('error', (e) => console.error(e));
  ```
- `close` TCP服务关闭时候触发该事件。
  ```ts
  provider.on('close', () => console.log('\n - Tcp closed'));
  ```
- `data` 处理由客户端传入数据的事件，也是核心事件。通过这个事件可以对当前传入参数做自定义处理。参数为一个reply，主要用于对数据返回处理的一个包裹函数。
  ```ts
  import { Connection } from '@dubbo.ts/provider';
  provider.on('data', (reply: ReturnType<Connection['createExecution']>) => {
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
consumer.launch();
```

### Consumer Connect

直连模式

```ts
// consumer.connect(host: string, port: number)
const client = consumer.connect('127.0.0.1', 8081);
const result = await client.execute(interface, method, args);
```

注册中心

```ts
// consumer.invoke(inteface: string, configs?: { version?: string, group?: string });
const client = await consumer.invoke(interface, {});
const result = await client.execute(interface, method, args);
```

`consumer.invoke`主要是用来从注册中心查询资源后得到`host`与`port`来实例化一个直连的clinent对象。它不会重复创建实例，而是缓存已有的实例。不必担心每次调用都是实例化的问题。

`consumer.invoke`的`interface`与 `client.execute` 的 `interface` 是同一个，这样做仅仅是 `consumer.invoke` 来获取注册中心的资源，而`client.execute`才是真正执行的参数。

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
- `error` 服务出错触发该事件，接受一个错误对象。
  ```ts
  consumer.on('error', (e) => console.error(e));
  ```
- `channels` 当从注册中心获取到数据后触发该事件，参数为所有有效匹配解构的URL序列化对象。
  ```ts
  consumer.on('channels', result => console.log('get channels:', result.map((res: any) => res.host)));
  ```

## Annotation Server

结合IOC理念,我们使用`inversify`来解构我们的开发,从而产生了基于注解式的服务写法,类似java中的注解写法,以便开发者能够快速开发应用.

```ts
import { Application } from '@dubbo.ts/application';
import { Server, Service, Proxy, Version, Group, inject } from '@dubbo.ts/server';

@Service('Com.Node.Dubbo.Test')
// @Version('1.0.0')
// @Group('development')
class Test {
  @inject(SomeOtherModule) private readonly SomeOtherModule: SomeOtherModule;
  @Proxy()
  public sum(a: number, b: number) {
    return a + b + this.SomeOtherModule.sum(a, b);
  }
}

const app = new Application();
const server = new Server(app);

app.application = '测试';
app.port = 6000;

server.addService(Test);

server.listen().then(tcp => {
  console.log(' - Tcp server on', 'port:', app.port, 'status:', tcp.listening);
});
```

> 只有被`@Proxy()`标记过的函数才能被微服务调用.因为我们本来就应该考虑只有公共函数才被调用,而私有函数肯定不希望被调用.通过这个注解我们可以达到这个目的.

**Events:**

- `collect:class` 在解析class时候metadata数据的自定义处理周期
  ```ts
  import { TClassIndefiner, TAnnotationScanerResult } from '@dubbo.ts/server';
  server.on('collect:class', (classModule: TClassIndefiner<any>, options: TAnnotationScanerResult) => {});
  ```
- `collect:method` 在解析method时候metadata数据的自定义处理周期
  ```ts
  import { TClassIndefiner, TAnnotationScanerResult, TAnnotationScanerMethod } from '@dubbo.ts/server';
  server.on('collect:method', (classModule: TClassIndefiner<any>, key: string, method: TAnnotationScanerMethod) => {});
  ```
- `collect:data` 在最终解析时候等到的系统给定的数据
  ```ts
  import { TClassIndefiner, TMetaData } from '@dubbo.ts/server';
  server.on('collect:data', (classModule: TClassIndefiner<any>, options: TMetaData) => {});
  ```
- `runtime:before` 运行时前置任务周期
  ```ts
  import { TDecodeRequestSchema } from '@dubbo.ts/protocol';
  server.on('runtime:before', (schema: TDecodeRequestSchema, options: { target: any, method: string }) => {});
  ```
- `runtime:after` 运行时后置任务周期
  ```ts
  import { TDecodeRequestSchema } from '@dubbo.ts/protocol';
  server.on('runtime:after', (schema: TDecodeRequestSchema, result: any) => {});
  ```

> `Events` 主要用于对功能的扩展,可以接入很多自定义功能.