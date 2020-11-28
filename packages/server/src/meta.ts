import { localhost } from '@dubbo.ts/utils';
export type TTransformMethod = {
  parameters: TTransformMehtodParameters,
  metadata: Map<string, any>
}
export type TTransformMehtodParameter = Map<string, any>;
export type TTransformMehtodParameters = TTransformMehtodParameter[];
export type TTransformClass = Map<string, any>;

export class TransformMetaData {
  public readonly interface: string;
  public readonly group: string;
  public readonly version: string;
  public readonly port: number;
  public readonly classMetadata: TTransformClass = new Map();
  public readonly classMethods: Map<string, TTransformMethod> = new Map();
  public readonly host = localhost;
  constructor(name: string, group: string, version: string, port: number) {
    this.interface = name;
    this.group = group;
    this.version = version;
    this.port = port;
  }

  public ensureClassMethod(name: string) {
    if (!this.classMethods.has(name)) {
      this.classMethods.set(name, {
        parameters: [],
        metadata: new Map(),
      });
    }
    return this.classMethods.get(name);
  }

  public ensureClassMethodParameter(name: string, index: number) {
    const method = this.ensureClassMethod(name);
    const parameters = method.parameters;
    if (parameters[index] === undefined) {
      parameters[index] = new Map();
    }
    return parameters[index];
  }
}