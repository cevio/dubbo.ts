import { JSONSchema } from 'json-schema-typed';
import { MethodMetaCreator } from '@dubbo.ts/server';
export const outputSchemaNameSpace = 'Com.Swagger.Output';
export function OutputSchema(schema: JSONSchema) {
  return MethodMetaCreator.define(outputSchemaNameSpace, schema);
}