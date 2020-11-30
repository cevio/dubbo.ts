import { Application } from '@dubbo.ts/application';
import { Provider } from '../src';

const app = new Application();
const provider = new Provider(app);

app.version = '2.0.2';
app.heartbeat = 600000;
app.port = 8081;

app.on('error', async e => console.log(e));

provider.on('connect', async () => console.log('client connected'));
provider.on('disconnect', async () => console.log('client disconnect'))
provider.on('error', async (e) => console.error(e));
provider.on('start', async () => console.log('tcp started'));
provider.on('stop', async () => console.log('tcp stoped'));

provider.on('data', async (reply) => {
  reply(async (schema, status) => {
    // console.log('schema', schema);
    return {
      status: status.OK,
      data: {
        value: 'ok'
      }
    }
  })
})

app.start();