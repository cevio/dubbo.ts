import 'reflect-metadata';
import { MethodMetaCreator } from './methodMetaCreator';

export class ParameterMetaCreator {
  static namespace = Symbol('metadata.parameter.namespace');
  private readonly stacks: Record<string, any>[] = [];
  public parent: MethodMetaCreator;

  setParent(value: MethodMetaCreator) {
		this.parent = value;
	}

  get size() {
    return this.stacks.length;
  }

  public set<T = any>(index: number, key: string, value: T) {
    if (this.stacks[index] === undefined) {
      this.stacks[index] = {};
    }
    this.stacks[index][key] = value;
    return this;
  }

  public get(index: number, key?: string) {
    const chunk = this.stacks[index];
    if (chunk === undefined) return;
    if (!key) return chunk;
    return this.stacks[index][key];
  }

  public each(callback: (value: Record<string, any>, index: number) => void) {
    this.stacks.forEach(callback);
    return this;
  }

  public map<T = any>(callback: (value: Record<string, any>, index: number) => T) {
    return this.stacks.map(callback);
  }

  static instance(obj: Object) {
		let meta: ParameterMetaCreator;
		if (!Reflect.hasMetadata(ParameterMetaCreator.namespace, obj)) {
			meta = new ParameterMetaCreator();
			Reflect.defineMetadata(ParameterMetaCreator.namespace, meta, obj);
		} else {
			meta = Reflect.getMetadata(ParameterMetaCreator.namespace, obj) as ParameterMetaCreator;
		}
		return meta;
  }
  
  static define<T = any>(key: string, value: T): ParameterDecorator {
    return (target, property, index) => {
      const clazz = target.constructor.prototype[property];
      if (!clazz) return;
      const meta = ParameterMetaCreator.instance(clazz);
      meta.set(index, key, value);
    }
  }

  static pushToParent(key: string, ...args: any): ParameterDecorator {
    return (target, property, index) => {
      const func = Object.getOwnPropertyDescriptor(target.constructor.prototype, property);
      const meta = MethodMetaCreator.instance(func);
      const data = meta.has(key) ? meta.get<any[]>(key) : [];
			data.push(...args);
			meta.set(key, data);
    }
  }

  static unshiftToParent(key: string, ...args: any): ParameterDecorator {
    return (target, property, index) => {
      const func = Object.getOwnPropertyDescriptor(target.constructor.prototype, property);
      const meta = MethodMetaCreator.instance(func);
      const data = meta.has(key) ? meta.get<any[]>(key) : [];
			data.push(...args);
			meta.set(key, data);
    }
  }

  static joinToParent(...args: ParameterDecorator[]): ParameterDecorator {
    return (target, property, index) => args.forEach(arg => arg(target, property, index));
  }
}