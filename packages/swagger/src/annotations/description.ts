import { ClassMetaCreator } from '@dubbo.ts/server';
export const DescriptionNameSpace = 'Com.Swagger.Description';
export function Description(value: string) {
  return ClassMetaCreator.define(DescriptionNameSpace, value);
}