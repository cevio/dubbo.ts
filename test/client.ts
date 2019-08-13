import { Registry, Consumer } from '../src';
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