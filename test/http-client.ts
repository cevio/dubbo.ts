import { createServer } from 'http';
import { Consumer } from '../lib/Consumer';
import { Attachment } from '../lib/protocol/attachment';

const java = require('js-to-java');

const consumer = new Consumer({
  application: 'client',
  version: '2.0.2',
});

consumer.launch();

const server = createServer((req, res) => {
  console.log('[' + Date.now() + ']', '- url:', req.url);
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

server.on('close', () => consumer.close());

async function run() {
  const client = await consumer.connect('127.0.0.1', 8081);
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
  return await client.execute(method, args, {
    [Attachment.VERSION_KEY]: '1.0.0',
    [Attachment.INTERFACE_KEY]: 'com.mifa.stib.factory',
  });
}