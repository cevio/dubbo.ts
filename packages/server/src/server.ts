import { Application } from '@dubbo.ts/application';
import { Provider, TProviderReply } from '@dubbo.ts/provider';
import { AnnotationDependenciesAutoRegister, AnnotationMetaDataScan, TClassIndefiner } from './annotation/implemention/metaDataScaner';
import { Container } from 'inversify';
import { Attachment, RESPONSE_STATUS, TDecodeRequestSchema } from '@dubbo.ts/protocol';
import { NAMESPACE } from './annotation/support/namespace';
export class Server extends Provider {
  public readonly container = new Container();
  // interface - group - version: ClassModule
  private readonly modules: Map<string, Map<string, Map<string, TClassIndefiner<any>>>> = new Map();
  constructor(app: Application) {
    super(app);
    this.on('data', (reply: TProviderReply) => reply(async (schema, status) => this.execute(schema, status)));
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
    if (!target[method]) return this.responseNotFound(status, `Cannot find the method: ${classInterface}#${classGroup}@${classVersion}:${method}`)
    const result = await Promise.resolve(target[method](...parameters));
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
    const classVersion = classMetadata.meta.got<string>(NAMESPACE.GROUP, '0.0.0');
    const classMethods: string[] = [];
    this.injectClassModules(...classInjectors);
    for (const [key, method] of classMetadata.methods) {
      const propertyProxy = method.meta.got<boolean>(NAMESPACE.PROXY, false);
      if (!propertyProxy) continue;
      classMethods.push(key);
      const propertyInjectors = method.meta.got<TClassIndefiner<any>[]>(NAMESPACE.INJECTABLE, []);
      this.injectClassModules(...propertyInjectors);
    }
    this.setStorageMetaData(classInterface, classGroup, classVersion, classModule);
    if (this.application.registry) {
      this.application.registry.addService(classInterface, classMethods, {
        group: classGroup,
        version: classVersion,
      });
    }
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
}