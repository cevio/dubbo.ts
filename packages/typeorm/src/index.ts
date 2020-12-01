import { Server } from '@dubbo.ts/server';
import { createConnection, ConnectionOptions } from 'typeorm';
export const typeorm = Symbol('typeorm');
export function useTypeOrm(server: Server, options: ConnectionOptions) {
  server.application.on('mounted', async () => {
    const connection = await createConnection(options);
    server.container.bind(typeorm).toConstantValue(connection);
    server.application.on('unmounted', () => connection.close());
  });
}