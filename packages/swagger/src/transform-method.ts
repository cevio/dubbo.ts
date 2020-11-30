import { JSONSchema } from 'json-schema-typed';
import { TAnnotationScanerMethod, TClassIndefiner, TTransformMethod } from '@dubbo.ts/server';
import { outputSchemaNameSpace } from './annotations';
export async function TransformClassMethod(options: {
  classModule: TClassIndefiner<any>,
  classMethodName: string,
  annotationClassMethodMetadata: TAnnotationScanerMethod,
  metadata: TTransformMethod
}) {
  const outputschema = options.annotationClassMethodMetadata.meta.got<JSONSchema>(outputSchemaNameSpace, null);
  if (outputschema) options.metadata.metadata.set(outputSchemaNameSpace, outputschema);
}