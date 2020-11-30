import { createServer } from 'http';
import { Application } from '@dubbo.ts/application';
import { Consumer } from '../src';
import { ZooKeeper } from '@dubbo.ts/zookeeper';

const app = new Application();
const consumer = new Consumer(app);
const java = require('js-to-java');
const registry = new ZooKeeper(app, {
  host: '127.0.0.1'
});

app.application = 'client';
app.version = '2.0.2';
app.timeout = 10000;
app.retries = 3;
app.heartbeat = 600000;

app.useRegistry(registry);
app.useConsumer(consumer);

consumer.on('start', async () => console.log(' + [consumer]', 'started'))
consumer.on('stop', async () => console.log(' - [consumer]', 'stoped'))
consumer.on('disconnect', async () => console.log(' - [consumer]', 'server disconnect'));
consumer.on('connect', async () => console.log(' + [consumer]', 'server connected'));
consumer.on('reconnect', async () => console.log(' # [consumer]', 'server reconnected'));
consumer.on('error', async e => console.error(' ! [consumer]', e));
consumer.on('channels', async result => console.log(' $ [consumer]', result.map((res: any) => res.host)));
consumer.on('heartbeat', async () => console.log(' @ [heartbeat]', 'send'))
consumer.on('heartbeat:timeout', async () => console.log(' @ [heartbeat]', 'timeout'));

registry.on('start', async () => console.log(' + [registry]', 'started'));
registry.on('stop', async () => console.log(' - [registry]', 'stoped'));
registry.on('node:create', async node => console.log(' + [registry]', 'create node:', node));
registry.on('node:remove', async node => console.log(' - [registry]', 'remove node:', node));

createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.statusCode = 200;
    return res.end();
  }
  run().then(data => {
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  }).catch(e => {
    console.log(e)
    res.statusCode = 500;
    res.end(e.message);
  })
}).listen(9001, () => {
  console.log('start at 9001');
  app.start();
});

async function run() {
  const client = await registry.invoke('com.mifa.stib.factory', {});
  const name = 'com.mifa.stib.factory';
  const method = 'use';
  const args = [java.combine('com.mifa.stib.common.RpcData', {
      data: {"name":"gxh","age":"18","word":""},
      headers: {
        appName: 'dist',
        platform: 1,
        equipment: 1,
        trace: '客户端中连接池中的一个连接遇到若干次连续的请求异常，原因可能很多：例如 服务端断开连接、服务暂时不可用、请求超时等。客户端中连接池中的一个连接遇到若干次连续的请求异常，原因可能很多：例如 服务端断开连接、服务暂时不可用、请求超时等。客户端中连接池中的一个连接遇到若干次连续的请求异常，原因可能很多：例如 服务端断开连接、服务暂时不可用、请求超时等。客户端中连接池中的一个连接遇到若干次连续的请求异常，原因可能很多：例如 服务端断开连接、服务暂时不可用、请求超时等。客户端中连接池中的一个连接遇到若干次连续的请求异常，原因可能很多：例如 服务端断开连接、服务暂时不可用、请求超时等。客户端中连接池中的一个连接遇到若干次连续的请求异常，原因可能很多：例如 服务端断开连接、服务暂时不可用、请求超时等。'
      },
      user: {
        id: 1
      },
    }
  )];

  return await client.execute(name, method, args);
}