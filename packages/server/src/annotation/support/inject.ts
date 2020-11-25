import { TClassIndefiner, ClassMetaCreator, MethodMetaCreator } from "../implemention";
import { NAMESPACE } from "./namespace";

export function useInject(...args: TClassIndefiner<any>[]) {
  return <T>(target: Object, property?: string | symbol, descripor?: TypedPropertyDescriptor<T>) => {
    if (!property) {
      ClassMetaCreator.push(NAMESPACE.INJECTABLE, ...args)(target as Function);
    } else {
      MethodMetaCreator.push(NAMESPACE.INJECTABLE, ...args)(target, property, descripor);
    }
  }
}