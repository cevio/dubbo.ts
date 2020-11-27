import { ClassMetaCreator, MethodMetaCreator } from '@dubbo.ts/server';
export const DescriptionNameSpace = 'Com.Swagger.Description';
export function Description(value: string) {
  return <T>(target: Object, property?: string | symbol, descriptor?: TypedPropertyDescriptor<T>) => {
    if (!property) {
      return ClassMetaCreator.define(DescriptionNameSpace, value)(target as Function);
    } else {
      return MethodMetaCreator.define(DescriptionNameSpace, value)(target, property, descriptor);
    }
  }
}