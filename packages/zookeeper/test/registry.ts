import { ZooKeeper } from '../src';
import { app } from './application';
import { interfaceExports } from './code';

export function createRegistry() {
  const registry = new ZooKeeper(app, {
    host: '127.0.0.1'
  });

  app.useRegistry(registry);

  const keys = Object.keys(interfaceExports);
  const name = keys[0];
  const methods = Object.keys(interfaceExports[name as keyof typeof interfaceExports]);
  
  registry.addProviderService(name, methods);

  return registry;
}