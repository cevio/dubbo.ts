import { Application } from '@dubbo.ts/application';
import { ZooKeeper } from '@dubbo.ts/zookeeper';
import { Provider } from '../src';

const app = new Application();
const provider = new Provider(app);
const registry = new ZooKeeper(app, {
  host: '127.0.0.1'
});

app.application = 'server';
app.version = '2.0.2';
app.heartbeat = 600000;
app.port = 8081;

app.useProvider(provider);
app.useRegistry(registry);

registry.addProviderService('com.mifa.stib.factory', ['use']);

provider.on('connect', async () => console.log(' + [Provider]', 'client connected'));
provider.on('disconnect', async () => console.log(' - [Provider]', 'client disconnect'));
provider.on('error', async (e) => console.error(' x [provider]', e));
provider.on('start', async () => console.log(' @ [Provider]', 'started'));
provider.on('stop', async () => console.log(' @ [Provider]', 'stoped'));
provider.on('data', async (reply) => {
  reply(async (schema, status) => {
    return {
      status: status.OK,
      data: {
        value: 'ok'
      }
    }
  })
});

registry.on('node:create', async node => console.log(' + [registry]', node));
registry.on('node:remove', async node => console.log(' - [registry]', node));
registry.on('start', async () => console.log(' @ [registry]', 'started'));
registry.on('stop', async () => console.log(' @ [registry]', 'stoped'));

app.start();

