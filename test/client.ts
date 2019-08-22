import { Registry, Consumer, SwaggerConsumer } from '../src';
import * as http from 'http';
const java = require('js-to-java');

const registry = new Registry({
  host: '192.168.2.150:2181',
});

const consumer = new Consumer({
  application: 'dist',
  dubbo_version: '2.0.2',
  pid: process.pid,
  registry: registry,
});
const swagger = new SwaggerConsumer('test', registry);
let closing = false;
process.on('SIGINT', () => {
  if (closing) return;
  closing = true;
  let closed = false;
  consumer.close().then(() => closed = true).catch(e => {
    console.error(e);
    closed = true;
  })
  setInterval(() => {
    if (closed) {
      console.log('closed')
      process.exit(0);
    }
  }, 300);
});

consumer.listen().then(() => new Promise((resolve) => {
  http.createServer((req, res) => {
    (async () => {
      // const invoker = await consumer.get('com.mifa.stib.service.ProviderService');
      // return await invoker.invoke('testRpc', [java.combine('com.mifa.stib.common.RpcData', {
      //   data: {"name":"gxh","age":"18","word":""},
      //   headers: {
      //     appName: 'dist',
      //     platform: 1,
      //     equipment: 1,
      //     trace: 'dsafa-dsf-dsaf-sda-f-sa'
      //   },
      //   user: {
      //     id: 1
      //   },
      // })]);
      return swagger.get();
    })().then((data: any) => {
      // res.setDefaultEncoding('utf8');
      res.end(JSON.stringify(data));
    }).catch(e => {
      res.statusCode = 500;
      res.end(e.stack);
    });
  }).listen(9001, resolve)
})).then(() => console.log('client connected')).catch(e => console.error(e));