import 'reflect-metadata';
import { MethodMetaCreator } from './methodMetaCreator';

type ParameterHandler<TContext = any, TResult = any> = (ctx: TContext, ...args: any[]) => TResult | Promise<TResult>;

export class ParameterMetaCreator {
  static namespace = Symbol('metadata.parameter.namespace');
  private readonly stacks: ParameterHandler<any>[] = [];
  public parent: MethodMetaCreator;

  setParent(value: MethodMetaCreator) {
		this.parent = value;
	}

  get size() {
    return this.stacks.length;
  }

  public set<T = any, R = any>(index: number, callback: ParameterHandler<T, R>) {
    this.stacks[index] = callback;
    return this;
  }

  public get<T = any, R = any>(index: number, ctx?: T, ...args: any[]) {
    if (typeof this.stacks[index] !== 'function') return;
    return this.stacks[index](ctx, ...args) as R | Promise<R>;
  }

  public exec<T = any, R = any>(ctx: T) {
    return Promise.all<R>(this.stacks.map(fn => {
      if (typeof fn === 'function') return Promise.resolve(fn(ctx));
      return Promise.resolve();
    }));
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
  
  static define<T = any, R = any>(callback: ParameterHandler<T, R>): ParameterDecorator {
    return (target, property, index) => {
      const clazz = target.constructor.prototype[property];
      if (!clazz) return;
      const meta = ParameterMetaCreator.instance(clazz);
      meta.set(index, (ctx: T) => callback(ctx));
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