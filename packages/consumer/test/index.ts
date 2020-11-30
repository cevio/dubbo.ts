import { createServer } from 'http';
import { Application } from '@dubbo.ts/application';
import { Consumer } from '../src';

const app = new Application();
const consumer = new Consumer(app);
const java = require('js-to-java');

app.version = '2.0.2';
app.timeout = 10000;
app.retries = 3;
app.heartbeat = 600000;

consumer.launch();

consumer.on('disconnect', async (conn) => console.log('server disconnect', conn.id));
consumer.on('connect', async (conn) => console.log('server connected', conn.id));
consumer.on('reconnect', async (conn) => console.log('server connected', conn.id));
consumer.on('error', async e => console.error(e));
consumer.on('channels', async url => console.log('channels:', url.map(u => u.host)));

createServer((req, res) => {
  if (req.url === '/favicon.ico') {
    res.statusCode = 200;
    return res.end();
  }
  run().then(data => {
    res.statusCode = 200;
    res.end(JSON.stringify(data));
  }).catch(e => {
    res.statusCode = 500;
    res.end(e.message);
  })
}).listen(9001, () => {
  console.log('start at 9001');
});

async function run() {
  const client = consumer.connect('127.0.0.1', 8081);
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