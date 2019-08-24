# 利用dubbo打造真正的nodejs端的微服务体系

Java在微服务方面的生态比较完善，国内常见的有：

- 基于consul的spring生态。`nest-cloud`就是基于consul来搭建微服务。
- 阿里巴巴的`dubbo`与`sofa`。

基本上国内的Java微服务都是使用以上的生态。而nodejs为了能够与Java微服务互通，目前还没有非常完善的体系，除了`nest-cloud`的微服务体系。今天，我主要为了讲解如何在nodejs上通过`dubbo`打造与Java互通的微服务体系。

我们的主角是 **[dubbo.ts](https://github.com/cevio/dubbo.ts)**

> 如果不是TS写的，都不好意思拿出来说。

## TCP通讯

所有的微服务基本都基于TCP的长连接，我们要解决的问题主要是以下几个：

- TCP数据发送与接收时候的粘包与拆包问题
- TCP连接的心跳检测以及重连重试机制
- 数据传输时候的序列化与发序列化算法
- 使用注册中心的订阅机制

TCP传输具有非常可靠的安全性，不像UDP传输那样会丢包，所以微服务间的通讯基本使用TCP去完成，一旦连接，通讯速度是非常快的。

## 服务的注册与发现

一般的，在dubbo中，我们使用 [Zookeeper](http://zookeeper.apache.org/) 来实现服务注册与发现，但是也有生态是使用Redis来实现的。不过今天我们就讲使用ZK的场景下的微服务。

其实ZK就是一个云端的KEY/VALUE存储器，同时具备了订阅通知的功能。这里推荐使用[node-zookeeper-client](https://www.npmjs.com/package/node-zookeeper-client)，这个库已相当稳定，每周下载量也不少，值得放心使用。

使用`dubbo.ts`创建注册中心的连接是非常简单的：

```ts
import { Registry, RegistryInitOptions } from 'dubbo.ts';
const registry = new Registry({
  host: '127.0.0.1:2181' // zk地址
} as RegistryInitOptions);
await registry.connect(); // 连接
registry.close(); // 断开
```

## 提供服务

纵观整个NPM，没有找出服务提供者的库。一般来说，使用dubbo的nodejs程序，仅仅只是调用java方服务的，无法提供基于nodejs的微服务的注册与被调用。也就是说，通过`dubbo.ts`我们可以像java一样，在注册中心注册我们的微服务，供nodejs或者java来调用。

在dubbo.ts中，我们可以这样来玩：

1. 创建服务提供者对象

```ts
import { 
  Provider, 
  ProviderInitOptions, 
  ProviderServiceChunkInitOptions 
} from 'dubbo.ts';

const provider = new Provider({
  application: 'test',
  dubbo_version: '2.0.2',
  port: 8080,
  pid: process.pid,
  registry: registry,
  heartbeat?: 60000,
} as ProviderInitOptions);
```

2. 为其添加微服务接口定义

```ts
class CUATOM_SERVICE {
  xxx() {}
  ddd() {}
}
provider.addService(CUATOM_SERVICE, {
  interface: 'xxx',
  version: 'x.x.x',
  group; 'xxxx',
  methods: ['xxx', 'ddd'],
  timeout: 3000
} as ProviderServiceChunkInitOptions);
// ..,.
```

3. 启动服务自动注册到中心或者卸载服务

```ts
await provider.listen();
await provider.close();
```

如果你有zk的监控平台，那么你可以在平台上看到微服务已经被注册上去了。

## 消费者

消费者就是用来连接微服务，通过方法及参数来获得最终数据的。它通过ZK自动发现服务后连接服务，当服务被注销的时候也自动注销连接。当请求服务的时候有如下规则：

- 如果服务方法超时，将自动重试。
- 如果重试的时候，微服务提供者是多个，那么重试的时候将择优选择不同的相同微服务接口调用。
- 如果重试时候，微服务提供者只有一个，那么重试这个接口N次。
- 如果重试没有提供者，将报`no prividers`错误。

创建消费者对象：

```ts
import { Consumer } from 'dubbo.ts';
const consumer = new Consumer({
  application: 'dist',
  dubbo_version: '2.0.2',
  pid: process.pid,
  registry: registry,
});
await consumer.listen();
await consumer.close();
```

连接微服务获取数据

```ts
const invoker = await consumer.get('com.mifa.stib.service.ProviderService');
const java = require('js-to-java');
type resultData = {
  name: string,
  age: number,
}
const result = await invoker.invoke<resultData>('testRpc', [
  java.combine('com.mifa.stib.common.RpcData', {
    "name":"gxh",
    "age":"18",
  })
])
```

> 通过很简单的调用，我们就能获得微服务数据。NPM上所有消费者的设计都大同小异，有的还做了熔断处理。这里本架构没有做处理，用户可以根据需求自行完成。

## 架构成AOP模式

使用TS创建类似java的注解非常方便。无非利用`Provider.addService`的参数做文章，具体用户可以自行设计。这里我给大家看一个我司的最终使用例子(你也可以参考[@nelts/dubbo](https://github.com/nelts/dubbo/blob/master/src/index.ts#L103)的注解设计来完成)：

```ts
import { provide, inject } from 'injection';
import { rpc } from '@nelts/dubbo';
import { RPC_INPUT_SCHEMA, MIN_PROGRAM_TYPE, error } from '@node/com.stib.utils'; // 私有源上的包，参考时候可忽略功能
import WX from './wx';
import * as ioredis from 'ioredis';

@provide('User')
@rpc.interface('com.mifa.stib.service.User')
@rpc.version('1.0.0')
export default class UserService {
  @inject('wx')
  private wx: WX;

  @inject('redis')
  private redis: ioredis.Redis;

  @rpc.method
  @rpc.middleware(OutputConsole)
  login(req: RPC_INPUT_SCHEMA) {
    switch (req.headers.platform) {
      case MIN_PROGRAM_TYPE.WX:
        if (req.data.code) return this.wx.codeSession(req.data.code);
        return this.wx.jsLogin(req.data, req.headers.appName);
      case MIN_PROGRAM_TYPE.WX_SDK: return this.wx.sdkLogin(req.data.code, req.headers.appName);
      default: throw error('不支持的登录类型');
    }
  }

  @rpc.method
  async status(req: RPC_INPUT_SCHEMA) {
    if (!req.headers.userToken) throw error('401 Not logined', 401);
    const value = await this.redis.get(req.headers.userToken);
    if (!value) throw error('401 Not logined', 401);
    const user = await this.redis.hgetall(value);
    if (!value) throw error('401 Not logined', 401);
    user.sex = Number(user.sex);
    user.id = undefined;
    user.create_time = undefined;
    user.modify_time = undefined;
    user.unionid = undefined;
    return user;
  }
}

async function OutputConsole(ctx, next) {
  console.log('in middleware');
  await next()
}
```

> 我推荐使用`midway.js`的`injection`模块来设计服务间的IOC模型，这样更有利于开发与维护。

## Swagger

一般来说，在java中，swagger是建立在微服务上的，spring的一整套swagger都是纯HTTP的。我参考了dubbo的swagger方式，觉得单服务单swagger的模式并不有利于开发者查阅，所以，我们约定了一种分布式swagger模式。在duboo.ts已内置。

微服务swagger方法，采用zookeeper自管理方案。通过微服务启动，收集interface与method信息上报到自定义zookeeper节点来完成数据上报。前端服务，可以通过读取这个节点信息来获得具体的接口与方法。

上报格式:

```
/swagger/{subject}/{interface}/exports/{base64 data}
```

url参数：

- `subject` 总项目命名节点名
- `interface` 接口名
- `base64 data` 它是一个记录该接口下方法和参数的数组(最终base64化)，见以下参数格式。

base64 data 参数详解:

```ts
type Base64DataType = {
  description?: string, // 该接口的描述
  group: string, // 组名 如果没有组，请使用字符串`-`
  version: string, // 版本名 如果没有版本，请使用字符串 `0.0.0`
  methods: [
    {
      name: string, // 方法名
      summary?: string, // 方法描述，摘要
      input: Array<{ $class: string, $schema: JSONSCHEMA; }>, // 入参
      output: JSONSCHEMA // 出参
    },
    // ...
  ]
}
```

最终将数据base64后再进行encodeURIComponent操作，最后插入zookeeper的节点即可。

在Provider程序中，我们可以这样使用来发布到zookeeper:

```ts
import { SwaggerProvider, Provider } from 'dubbo.ts';
const swagger = new SwaggerProvider('subject name', provider as Provider);
await swagger.publish(); // 发布
await swagger.unPublish(); // 卸载
```

使用SwaggerConsumer调用分布式swgger后得到的数据。

```ts
import { SwaggerConsumer, Registry } from 'dubbo.ts';
const swgger = new SwaggerConsumer('subject name', registry as Registry);
const resultTree = await swgger.get();
```

我们来看一个基于@nelts/dubbo的实例，在具体微服务的service上，我们可以这样写

```ts
import { provide, inject } from 'injection';
import { rpc } from '@nelts/dubbo';
import { RPC_INPUT_SCHEMA, MIN_PROGRAM_TYPE, error, RpcRequestParameter, RpcResponseParameter } from '@node/com.stib.utils';
import WX from './wx';
import * as ioredis from 'ioredis';
import Relations from './relations';
import { tableName as WxTableName } from '../tables/stib.user.wx';

@provide('User')
@rpc.interface('com.mifa.stib.service.UserService')
@rpc.version('1.0.0')
@rpc.description('用户中心服务接口')
export default class UserService {
  @inject('wx')
  private wx: WX;

  @inject('redis')
  private redis: ioredis.Redis;

  @inject('relation')
  private rel: Relations;

  @rpc.method
  @rpc.summay('用户统一登录')
  @rpc.parameters(RpcRequestParameter({
    type: 'object',
    properties: {
      code: {
        type: 'string'
      }
    }
  }))
  @rpc.response(RpcResponseParameter({ type: 'string' }))
  login(req: RPC_INPUT_SCHEMA) {
    switch (req.headers.platform) {
      case MIN_PROGRAM_TYPE.WX:
        if (req.data.code) return this.wx.codeSession(req.data.code);
        return this.wx.jsLogin(req.data, req.headers.appName);
      case MIN_PROGRAM_TYPE.WX_SDK: return this.wx.sdkLogin(req.data.code, req.headers.appName);
      default: throw error('不支持的登录类型');
    }
  }

  @rpc.method
  @rpc.parameters(RpcRequestParameter())
  @rpc.summay('获取当前用户状态')
  async status(req: RPC_INPUT_SCHEMA) {
    if (!req.headers.userToken) throw error('401 Not logined', 401);
    const rid = await this.redis.get(req.headers.userToken);
    if (!rid) throw error('401 Not logined', 401);
    const user = await this.getUserDetailInfoByRelationId(Number(rid)).catch(e => Promise.reject(error('401 Not logined', 401)));
    user.sex = Number(user.sex);
    Reflect.deleteProperty(user, 'id');
    Reflect.deleteProperty(user, 'create_time');
    Reflect.deleteProperty(user, 'modify_time');
    Reflect.deleteProperty(user, 'unionid');
    return user;
  }

  @rpc.method
  @rpc.summay('获取某个用户详细信息')
  @rpc.parameters(RpcRequestParameter({
    type: 'object',
    properties: {
      rid: {
        type: 'integer'
      }
    }
  }))
  async getUserDetailInfo(req: RPC_INPUT_SCHEMA) {
    return await this.getUserDetailInfoByRelationId(req.data.rid as number);
  }

  async getUserDetailInfoByRelationId(sid: number) {
    const relations: {
      f: string,
      p: string,
      s: string,
    } = await this.rel.get(sid);
    switch (relations.f) {
      case WxTableName: return await this.wx.getUserinfo(relations.f, Number(relations.s));
    }
  }
}
```

> 这种Swagger模式称为分布式swagger，它的优势在于，如果使用同一个zk注册中心，那么无论服务部署在那台服务器，都可以将swagger聚合在一起处理。

## 最后

无论是java调用nodejs的微服务还是nodejs调用java的微服务都是非常方便的。本文主要为了讲解如何在nodejs上打造一整套基于dubbo的微服务体系。该体系已在我司内部新项目中使用，很稳定。喜欢的朋友，可以具体参看 **[dubbo.ts](https://github.com/cevio/dubbo.ts)** 的文档，了解更多api的使用。希望dubbo.ts能在实际的业务场景中帮到您。感谢！