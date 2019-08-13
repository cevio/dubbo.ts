import { Registry, Provider, ProviderContext, PROVIDER_CONTEXT_STATUS } from '../src';

class CUSTOM_SERVICE {
  hello(a: number, b: number) {
    return a + b;
  }
}

const registry = new Registry({
  host: '192.168.2.208:2181',
});

const provider = new Provider({
  application: 'test',
  dubbo_version: '2.0.2',
  port: 8080,
  pid: process.pid,
  registry
});

process.on('SIGINT', () => {
  let closed = false;
  provider.close(() => {
    closed = true;
  });
  setInterval(() => {
    if (closed) {
      console.log('closed')
      process.exit(0);
    }
  }, 300);
});

provider.on('packet', async (ctx: ProviderContext) => {
  const structor = ctx.interface.Constructor;
  const a = new structor();
  ctx.status = PROVIDER_CONTEXT_STATUS.OK;
  ctx.body = await a[ctx.method](...ctx.parameters);
});

provider.addService({
  interface: 'com.mifa.test',
  version: '1.0.0',
  methods: ['hello'],
  target: CUSTOM_SERVICE
});

(async () => {
  await registry.connect();
  await provider.listen(8080, () => console.log('server start at 8080'));
})().then(() => console.log('service published')).catch(e => console.error(e));
