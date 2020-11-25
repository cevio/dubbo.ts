import { Application } from '@dubbo.ts/application';
import { Server, Service, Proxy } from '../src';

@Service('Com.Node.Dubbo.Test')
class Test {
  @Proxy()
  public sum(a: number, b: number) {
    return a + b;
  }
}

const app = new Application();
const server = new Server(app);

app.application = '测试';
app.port = 6000;

server.addService(Test);

server.listen().then(tcp => {
  console.log(' - Tcp server on', 'port:', app.port, 'status:', tcp.listening);
});