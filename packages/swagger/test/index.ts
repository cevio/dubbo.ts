import { Application } from '@dubbo.ts/application';
import { Server, Service, Proxy } from '@dubbo.ts/server';
import { ZooKeeper } from '@dubbo.ts/zookeeper';
import { Description, InputSchema, OutputSchema, useSwagger } from '../src';

@Service('Com.Node.Dubbo.Test')
@Description('Test demo')
class Test {
  @Proxy()
  @OutputSchema({
    type: 'integer',
    description: 'test method for sum'
  })
  public sum(
    @InputSchema({ type: 'integer' }) a: number, 
    @InputSchema({ type: 'integer' }) b: number
  ) {
    return a + b;
  }
}

const app = new Application();
const server = new Server(app);

app.application = '测试';
app.port = 6000;

new ZooKeeper(app, {
  host: '127.0.0.1'
})

useSwagger(server);

server.addService(Test);

server.listen().then(tcp => {
  console.log(' - Tcp server on', 'port:', app.port, 'status:', tcp.listening);
});