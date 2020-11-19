import { Registry } from '../lib/Registry/zookeeper';
import { Provider } from '../lib/Provider';
import { TDecodeServerSchema } from '../lib/Provider/decode';
import { Connection } from '../lib/Provider/connection';
import { TDecodeRequestSchema, TDecodeResponseSchema } from '../lib/protocol/decode';

// const registry = new Registry();
const provider = new Provider({
  // registry,
  application: 'server',
  port: 8081,
  // heartbeat: 3000,
  version: '2.0.2'
});

provider.addService({
  interface: 'com.mifa.stib.service.ProviderService',
  revision: '1.0.0',
  version: '1.0.0',
  methods: ['use'],
}).bind({
  use() {
    console.log('in use');
  }
});

provider.on('listening', () => console.log('listening......'));
provider.on('error', e => console.error(e));
provider.on('close', () => console.log('closed'));
provider.on('publish', url => console.log('  + publish: ' + url));
provider.on('unpublish', url => console.log('\n  - unpublish: ' + url));
provider.on('data', (schema: TDecodeRequestSchema, connection: Connection) => {
  connection.execute(schema, async (STATUS) => {
    return {
      status: STATUS.OK,
      data: {
        value: 'ok'
      }
    }
  })
});

provider.launch().then(() => console.log('started')).catch(e => provider.close());