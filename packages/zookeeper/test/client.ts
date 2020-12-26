import { createServer } from 'http';
import { parse } from 'url';
import { Consumer } from '@dubbo.ts/consumer';
import { app } from './application';
import { interfaceExports } from './code';
import { int } from 'js-to-java';
import { createRegistry } from './registry';
const registry = createRegistry();
const consumer = new Consumer(app);
app.useConsumer(consumer);

consumer.on('connect', async () => console.log(' - server connected'));
consumer.on('disconnect', async () => console.log(' - server disconnected'));
consumer.on('error', async (e) => console.error(e));
consumer.on('reconnect', async (n, d) => console.log('reconnect to server:', n, 'time', d, 'ms delay'));

createServer((req, res) => {
  const url = parse(req.url, true);
  if (!url.query.a || !url.query.b || isNaN(Number(url.query.a)) || isNaN(Number(url.query.b))) {
    res.statusCode = 400;
    return res.end('missing a or b, or none is a number');
  }
  const keys = Object.keys(interfaceExports);
  const name = keys[0];
  const methods = Object.keys(interfaceExports[name as keyof typeof interfaceExports]);
  const method = methods[0];

  registry.invoke(name).then(client => {
    return client.execute(name, method, [
      int(Number(url.query.a)), 
      int(Number(url.query.b))
    ]);
  }).then((c: number) => {
    res.statusCode = 200;
    res.end('a + b = ' + c);
  }).catch(e => {
    res.statusCode = 500;
    res.end(e.message);
  });
}).listen(8000, () => console.log(' + Client start HTTP server at port', 8000));

app.start();