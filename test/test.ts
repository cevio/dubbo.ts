import { Attachment } from '../lib/protocol/attachment';
import { Pool } from '../lib/protocol/pool';
import { Request } from '../lib/protocol/request';
import { Response } from '../lib/protocol/response';
import { RESPONSE_STATUS } from '../lib/protocol/utils';

const isRequest = false;
const isHeartBeat = false;

const java = require('js-to-java');
const req = new Request();
const res = new Response();
const pool = new Pool((buf) => {
  console.log('send buffer:', buf);
});

const attchment = new Attachment();
attchment.setMethodName('use');
attchment.setAttachment(Attachment.DUBBO_VERSION_KEY, '2.0.2');
attchment.setAttachment(Attachment.PATH_KEY, 'com.mifa.stib.common.use');
attchment.setAttachment(Attachment.VERSION_KEY, '1.0.0');
attchment.setAttachment(Attachment.GROUP_KEYT, 'default');
attchment.setAttachment(Attachment.INTERFACE_KEY, 'com.mifa.stib.common.use');
attchment.setAttachment(Attachment.PID_KEY, process.pid);
attchment.setAttachment(Attachment.APPLICATION_KEY, 'test');
attchment.setParameters([java.combine('com.mifa.stib.common.RpcData', {
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
})]);

pool.on('heartbeat', () => {
  console.log('this is heartbeat');
})
pool.on('request', data => {
  console.log('request result:', data);
})
pool.on('response', data => {
  console.log('response result:', data);
})

if (isRequest) {
  req.setTwoWay(true);
  isHeartBeat && req.setEvent(Request.HEARTBEAT_EVENT);
  req.setRequestId(1324);
  req.setData(attchment);
  pool.putReadBuffer(req.value());
} else {
  isHeartBeat && res.setEvent(Response.HEARTBEAT_EVENT);
  res.setRequestId(1324);
  res.setStatusCode(RESPONSE_STATUS.OK);
  res.setData(attchment, {
    value: 123
  });
  pool.putReadBuffer(res.value());
}
