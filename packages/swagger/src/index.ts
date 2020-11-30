import { Server } from '@dubbo.ts/server';
import { TransformClass } from './transform-class';
import { TransformClassMethod } from './transform-method';
import { TransformClassMethodParameter } from './transform-parameter';
import { DescriptionNameSpace, outputSchemaNameSpace, inputSchemaNameSpace } from './annotations';
import { TRegistry } from '@dubbo.ts/application';
import { JSONSchema } from 'json-schema-typed';

export * from './annotations';
export * from 'json-schema-typed';

export interface TSwaggerObject {
  host: string,
  port: number,
  description: string,
  methods: Record<string, {
    output: JSONSchema,
    parameters: JSONSchema[],
  }>
}

const paths: string[] = [];

/**
 * swagger 插件
 * @param server 
 * 
 * 我们需要的参数有:
 * 
 * 1. interface
 * 2. group
 * 3. version
 * 4. description
 * 5. methods:
 *    1. description
 *    2. key
 *    3. ouput schema
 *    4. input schemas:
 *       1. parameter index
 *       2. parameter schema
 * 6. host
 * 7. port
 */
export function useSwagger(server: Server) {
  const registry = server.application.registry;
  if (!registry) throw new Error('you must use Registry first.');
  server.on('collect:class', TransformClass);
  server.on('collect:method', TransformClassMethod);
  server.on('collect:paramter', TransformClassMethodParameter);
  server.application.on('mounted', async () => {
    for (let i = 0; i < server.transformMetadatas.length; i++) {
      const transform = server.transformMetadatas[i];
      const classMetadata = transform.classMetadata;
      const classMethods = transform.classMethods;
      let path = `/swagger/${transform.group}/${transform.interface}/${transform.version}`;

      const object: TSwaggerObject = {
        host: transform.host,
        port: transform.port,
        description: classMetadata.get(DescriptionNameSpace) as string,
        methods: {},
      }

      for (const [key, { parameters, metadata }] of classMethods) {
        const obj = {
          output: metadata.get(outputSchemaNameSpace),
          parameters: parameters.map(parameter => parameter.get(inputSchemaNameSpace)),
        }
        object.methods[key] = obj;
      }

      path += '/' + Buffer.from(JSON.stringify(object)).toString('base64');
      await registry.create(path);
      paths.push(path);
    }
    // const value = await queryRegistry(registry, '*', 'Com.Node.Dubbo.Test', '0.0.0');
    // value.forEach(str => {
    //   console.log(parse(str));
    // })
  });
  server.application.on('unmounted', async () => {
    const registry = server.application.registry;
    if (!registry) throw new Error('you must use Registry first.');
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      await registry.remove(path);
    }
  });
}

export function queryRegistry(regsitry: TRegistry, group: string = '*', name?: string, version?: string) {
  let path = '/swagger/' + group;
  if (name) path += '/' + name;
  if (version) path += '/' + version;
  return regsitry.query(path);
}

export function parse(str: string): TSwaggerObject {
  return JSON.parse(Buffer.from(str, 'base64').toString());
}
