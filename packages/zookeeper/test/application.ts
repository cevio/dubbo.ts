import { Application } from '@dubbo.ts/application';

export const app = new Application();

app.application = '演示dubbo协议框架的项目';
app.port = 6000;