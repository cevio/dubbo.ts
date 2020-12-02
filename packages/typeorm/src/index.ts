import { Server } from '@dubbo.ts/server';
import { createConnection, ConnectionOptions, Connection } from 'typeorm';
export const typeorm = Symbol('typeorm');
export function useTypeOrm(server: Server, options: ConnectionOptions) {
  let connection: Connection;
  server.container.bind(typeorm).toDynamicValue(() => connection);
  server.application.on('mounted', async () => {
    connection = await createConnection(options);
    server.application.on('unmounted', () => connection.close());
  });
}