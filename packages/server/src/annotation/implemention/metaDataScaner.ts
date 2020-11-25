import { ClassMetaCreator } from './classMetaCreator';
import { MethodMetaCreator } from './methodMetaCreator';
import { ParameterMetaCreator } from './parameterMetaCreator';
import { interfaces, METADATA_KEY, Container } from 'inversify';

export type TClassIndefiner<T> = interfaces.Newable<T> & interfaces.Abstract<T>;
export type TAnnotationScanerMethod = { meta: MethodMetaCreator, parameter: ParameterMetaCreator };
export type TAnnotationScanerResult = { meta: ClassMetaCreator, methods: Map<string, TAnnotationScanerMethod> };

export function AnnotationMetaDataScan<T extends TClassIndefiner<X>, X = any>(classModule: T, container?: Container): TAnnotationScanerResult {
  // Auto register parent and children.
  AnnotationDependenciesAutoRegister<T, X>(classModule, container);

  const classMeta = ClassMetaCreator.instance(classModule);
  const properties = Object.getOwnPropertyNames(classModule.prototype);
  const methods = new Map<string, TAnnotationScanerMethod>();

  properties.forEach(property => {
    if (property === 'constructor') return;
    const descriptor = Object.getOwnPropertyDescriptor(classModule.prototype, property);
    if (descriptor.value && typeof descriptor.value === 'function') {
      const that: Function = classModule.prototype[property];
      const methodMeta = MethodMetaCreator.instance(descriptor);
      const parameterMeta = ParameterMetaCreator.instance(that);
      methodMeta.setParent(classMeta);
      parameterMeta.setParent(methodMeta);
      methods.set(property, {
        meta: methodMeta,
        parameter: parameterMeta,
      });
    }
  });

  return {
    meta: classMeta,
    methods,
  };
}

export function AnnotationDependenciesAutoRegister<T extends TClassIndefiner<X>, X = any>(classModule: T, container?: Container) {
  const injectable = Reflect.hasMetadata(METADATA_KEY.PARAM_TYPES, classModule);
  if (injectable && container && !container.isBound(classModule)) {
    container.bind<X>(classModule).toSelf();
    const propsInjectable = Reflect.hasMetadata(METADATA_KEY.TAGGED_PROP, classModule);
    if (propsInjectable) {
      const props = Reflect.getMetadata(METADATA_KEY.TAGGED_PROP, classModule);
      for (const i in props) {
        const chunk = props[i] as { key: string, value: TClassIndefiner<any> }[];
        if (Array.isArray(chunk)) {
          chunk.forEach(model => {
            if (model.key === 'inject' && !container.isBound(model.value)) {
              AnnotationDependenciesAutoRegister(model.value, container);
            }
          })
        }
      }
    }
  }
}