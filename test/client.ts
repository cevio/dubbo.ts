import { Consumer } from '../lib/Consumer';
import { Attachment } from '../lib/protocol/attachment';

const java = require('js-to-java');

const consumer = new Consumer({
  application: 'client',
  version: '2.0.2',
});

consumer.launch();

setTimeout(async () => {
  console.log('sending...');
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
  client.execute(method, args, {
    [Attachment.VERSION_KEY]: '1.0.0',
    [Attachment.INTERFACE_KEY]: 'com.mifa.stib.factory',
  }).then((data) => console.log('last', data))
}, 2000);