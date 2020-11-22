import { Application } from '@dubbo.ts/application';
import { ZooKeeper } from '@dubbo.ts/zookeeper';
import { Connection, Provider } from '../src';

const app = new Application();
const provider = new Provider(app);
const registry = new ZooKeeper(app, {
  host: '127.0.0.1',
});

app.application = 'server';
app.version = '2.0.2';
app.heartbeat = 600000;
app.port = 8081;

app.useRegistry(registry);

registry.addService('com.mifa.stib.factory', ['use']);

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

