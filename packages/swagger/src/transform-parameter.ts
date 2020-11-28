import { JSONSchema } from 'json-schema-typed';
import { TClassIndefiner, TTransformMehtodParameter } from "@dubbo.ts/server";
import { inputSchemaNameSpace } from './annotations';

export function TransformClassMethodParameter(options: {
  classModule: TClassIndefiner<any>,
  classMethodName: string,
  classMethodParameterIndex: number,
  annotationClassMethodParameterValue: Record<string, any>,
  metadata: TTransformMehtodParameter,
}) {
  const inputschema = options.annotationClassMethodParameterValue[inputSchemaNameSpace] as JSONSchema;
  options.metadata.set(inputSchemaNameSpace, inputschema);
}