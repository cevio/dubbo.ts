import { Application, TRegistry } from '@dubbo.ts/application';
import { Provider } from '@dubbo.ts/provider';
import { Consumer } from '@dubbo.ts/consumer';
import { Events } from '@dubbo.ts/utils';
import { AnnotationDependenciesAutoRegister, AnnotationMetaDataScan, TAnnotationScanerMethod, TAnnotationScanerResult, TClassIndefiner } from './annotation/implemention/metaDataScaner';
import { Container } from 'inversify';
import { Attachment, RESPONSE_STATUS, TDecodeRequestSchema } from '@dubbo.ts/protocol';
import { NAMESPACE } from './annotation/support/namespace';
import { TransformMetaData, TTransformClass, TTransformMehtodParameter, TTransformMethod } from './meta';
import { ParameterMetaCreator } from './annotation';

type TServerEvents = {
  ['runtime:before']: [TDecodeRequestSchema, { target: any, method: string }],
  ['runtime:after']: [TDecodeRequestSchema, any],
  ['collect:class']: [{
    metadata: TTransformClass,
    classModule: TClassIndefiner<any>,
    annotationClassMetadata: TAnnotationScanerResult,
  }],
  ['collect:method']: [{
    classModule: TClassIndefiner<any>,
    classMethodName: string,
    annotationClassMethodMetadata: TAnnotationScanerMethod,
    metadata: TTransformMethod,
  }],
  ['collect:paramter']: [{
    classModule: TClassIndefiner<any>,
    classMethodName: string,
    classMethodParameterIndex: number,
    annotationClassMethodParameterValue: Record<string, any>,
    metadata: TTransformMehtodParameter,
  }]
}

export const fetcherKey = Symbol('server.fetch');
export type TFetcher = <T = any>(name: string, method: string, args: any[], configs: { group?: string, version?: string }) => Promise<T>;

export class Server extends Events<TServerEvents> {
  public readonly application: Application;
  public readonly provider: Provider;
  public readonly consumer: Consumer;
  public readonly transformMetadatas: TransformMetaData[] = [];
  public readonly container = new Container();
  // interface - group - version: ClassModule
  private readonly modules: Map<string, Map<string, Map<string, TClassIndefiner<any>>>> = new Map();
  constructor() {
    super();
    this.application = new Application();
    this.provider = new Provider(this.application);
    this.consumer = new Consumer(this.application);
    this.provider.on('data', async reply => reply((schema, status) => this.execute(schema, status)));
    this.application.useProvider(this.provider);
    this.application.useConsumer(this.consumer);
    this.container.bind<TFetcher>(fetcherKey)
      .toFunction(<T = any>(name: string, method: string, args: any[], configs: { group?: string, version?: string }) => {
        return this.invoke<T>(name, method, args, configs);
      });
  }

  private async invoke<T = any>(name: string, method: string, args: any[], configs: { group?: string, version?: string } = {}) {
    if (!this.application.registry) throw new Error('You must use registry first.');
    const client = await this.application.registry.invoke(name, configs);
    return await client.execute<T>(name, method, args, configs);
  }

  private async execute(schema: TDecodeRequestSchema, status: typeof RESPONSE_STATUS): Promise<{ status: RESPONSE_STATUS, data: any }> {
    const classInterface = schema.interface;
    const classGroup = schema.attachments[Attachment.GROUP_KEY] || '*';
    const classVersion = schema.version || schema.attachments[Attachment.VERSION_KEY] || '0.0.0';
    const method = schema.method;
    const parameters = schema.parameters;
    if (!this.modules.has(classInterface)) return this.responseNotFound(status, `Cannot find the interface: ${classInterface}`);
    const interfaceStorage = this.modules.get(classInterface);
    if (!interfaceStorage.has(classGroup)) return this.responseNotFound(status, `Cannot find the group: ${classInterface}#${classGroup}`);
    const groupStorage = interfaceStorage.get(classGroup);
    if (!interfaceStorage.has(classGroup)) return this.responseNotFound(status, `Cannot find the version: ${classInterface}#${classGroup}@${classVersion}`);
    const classModule = groupStorage.get(classVersion);
    const target = this.container.get(classModule);
    if (!target) return this.responseNotFound(status, `Cannot find the reference: ${classInterface}#${classGroup}@${classVersion}`);
    if (!target[method]) return this.responseNotFound(status, `Cannot find the method: ${classInterface}#${classGroup}@${classVersion}:${method}`);
    await this.emitAsync('runtime:before', schema, { target, method });
    const result = await Promise.resolve(target[method](...parameters));
    await this.emitAsync('runtime:after', schema, result)
    return {
      status: status.OK,
      data: result,
    }
  }

  private responseNotFound(status: typeof RESPONSE_STATUS, message: string) {
    return {
      status: status.SERVICE_NOT_FOUND,
      data: message,
    }
  }

  public addService(...classModules: TClassIndefiner<any>[]) {
    classModules.forEach(classModule => this.addone(classModule));
    return this;
  }

  private addone<T = any>(classModule: TClassIndefiner<T>) {
    const classMetadata = AnnotationMetaDataScan(classModule, this.container);
    const classInterface = classMetadata.meta.got<string>(NAMESPACE.INTERFACE, null);
    if (!classInterface) return;
    const classInjectors = classMetadata.meta.got<TClassIndefiner<any>[]>(NAMESPACE.INJECTABLE, []);
    const classGroup = classMetadata.meta.got<string>(NAMESPACE.GROUP, '*');
    const classVersion = classMetadata.meta.got<string>(NAMESPACE.VERSION, '0.0.0');
    const classMethods: string[] = [];
    const meta = new TransformMetaData(classInterface, classGroup, classVersion, this.application.port);
    this.emit('collect:class', {
      metadata: meta.classMetadata,
      classModule: classModule,
      annotationClassMetadata: classMetadata,
    });
    this.injectClassModules(...classInjectors);
    for (const [key, method] of classMetadata.methods) {
      const propertyProxy = method.meta.got<boolean>(NAMESPACE.PROXY, false);
      if (!propertyProxy) continue;
      classMethods.push(key);
      const propertyInjectors = method.meta.got<TClassIndefiner<any>[]>(NAMESPACE.INJECTABLE, []);
      this.injectClassModules(...propertyInjectors);
      const methodMetadata = meta.ensureClassMethod(key);
      this.emit('collect:method', {
        classModule: classModule,
        classMethodName: key,
        annotationClassMethodMetadata: method,
        metadata: methodMetadata
      });
      const parametersInstance = ParameterMetaCreator.instance(classModule.prototype[key]);
      if (parametersInstance.size) {
        parametersInstance.each((value, index) => {
          const parameterMetadata = meta.ensureClassMethodParameter(key, index);
          this.emit('collect:paramter', {
            classModule: classModule,
            classMethodName: key,
            classMethodParameterIndex: index,
            annotationClassMethodParameterValue: value,
            metadata: parameterMetadata,
          })
        })
      }
    }
    this.setStorageMetaData(classInterface, classGroup, classVersion, classModule);
    if (this.application.registry) {
      this.application.registry.addProviderService(classInterface, classMethods, {
        group: classGroup,
        version: classVersion,
      });
    }
    this.transformMetadatas.push(meta);
    return this;
  }

  private injectClassModules(...classModules: TClassIndefiner<any>[]) {
    classModules.forEach(classModule => AnnotationDependenciesAutoRegister(classModule, this.container));
    return this;
  }

  private setStorageMetaData<T = any>(classInterface: string, classGroup: string, classVersion: string, classModule: TClassIndefiner<T>) {
    if (!this.modules.has(classInterface)) this.modules.set(classInterface, new Map());
    const interfaceStorage = this.modules.get(classInterface);
    if (!interfaceStorage.has(classGroup)) interfaceStorage.set(classGroup, new Map());
    const groupStorage = interfaceStorage.get(classGroup);
    if (!groupStorage.has(classVersion)) groupStorage.set(classVersion, classModule);
    return this;
  }

  public listen() {
    return this.application.start();
  }
}