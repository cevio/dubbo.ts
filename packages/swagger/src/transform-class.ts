import { TAnnotationScanerResult, TClassIndefiner, TTransformClass, TTransformMethod } from '@dubbo.ts/server';
import { DescriptionNameSpace } from './annotations/description';
export function TransformClass(options: {
  classModule: TClassIndefiner<any>,
  annotationClassMetadata: TAnnotationScanerResult,
  metadata: TTransformClass
}) {
  const description = options.annotationClassMetadata.meta.got(DescriptionNameSpace, '[unDescripted]');
  options.metadata.set(DescriptionNameSpace,  description);
}