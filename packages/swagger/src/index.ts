import { 
  Server, 
  TClassIndefiner, 
  TAnnotationScanerResult, 
  TAnnotationScanerMethod, 
  TMetaData, 
} from '@dubbo.ts/server';

import { DescriptionNameSpace } from './annotations/description';

export function Swagger(server: Server) {
  server.on('collect:class', collectClassTransform);
  server.on('collect:method', collectMethodTransform);
  server.on('collect:data', collectMetaDataTransform);
}

function collectClassTransform(classModule: TClassIndefiner<any>, options: TAnnotationScanerResult) {
  const description = options.meta.got(DescriptionNameSpace, '[undescripted]');
  
}

function collectMethodTransform(classModule: TClassIndefiner<any>, key: string, method: TAnnotationScanerMethod) {

}

function collectMetaDataTransform(classModule: TClassIndefiner<any>, options: TMetaData) {

}