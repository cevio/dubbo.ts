import { JSONSchema } from 'json-schema-typed';
import { ParameterMetaCreator } from '@dubbo.ts/server';
export const inputSchemaNameSpace = 'Com.Swagger.Input';
export function InputSchema(schema: JSONSchema) {
  return ParameterMetaCreator.define(inputSchemaNameSpace, schema);
}