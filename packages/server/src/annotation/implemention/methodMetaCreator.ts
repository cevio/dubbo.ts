import 'reflect-metadata';
import { ClassMetaCreator } from './classMetaCreator';

export class MethodMetaCreator {
	static namespace = Symbol('metadata.method.namespace');
	private readonly stacks: Map<string | symbol, any> = new Map();
	public parent: ClassMetaCreator;

	setParent(value: ClassMetaCreator) {
		this.parent = value;
	}

	set<T = any>(key: string | symbol, value: T) {
    this.stacks.set(key, value);
    return this;
	}
	
	get<T = any>(key: string | symbol) {
    return this.stacks.get(key) as T;
	}
	
	get size() {
    return this.stacks.size;
	}
	
	has(key: string | symbol) {
    return this.stacks.has(key);
	}

	get isEmpty() {
		return this.size > 0;
	}

	got<R = any>(name: string | symbol, defaultValue?: R) {
		if (this.has(name)) return this.get<R>(name);
		return defaultValue;
	}
	
	static instance<T = any>(obj: TypedPropertyDescriptor<T>) {
		let meta: MethodMetaCreator;
		if (!Reflect.hasMetadata(MethodMetaCreator.namespace, obj.value)) {
			meta = new MethodMetaCreator();
			Reflect.defineMetadata(MethodMetaCreator.namespace, meta, obj.value);
		} else {
			meta = Reflect.getMetadata(MethodMetaCreator.namespace, obj.value) as MethodMetaCreator;
		}
		return meta;
	}

	static define<T = any>(key: string | symbol, value: T): MethodDecorator {
		return (target, property, descriptor) => {
			const meta = MethodMetaCreator.instance(descriptor);
			meta.set(key, value);
		}
	}

	static push(key: string | symbol, ...args: any[]): MethodDecorator {
		return (target, property, descriptor) => {
			const meta = MethodMetaCreator.instance(descriptor);
			const data = meta.has(key) ? meta.get<any[]>(key) : [];
			data.push(...args);
			meta.set(key, data);
		}
	}

	static unshift(key: string | symbol, ...args: any[]): MethodDecorator {
		return (target, property, descriptor) => {
			const meta = MethodMetaCreator.instance(descriptor);
			const data = meta.has(key) ? meta.get<any[]>(key) : [];
			data.unshift(...args);
			meta.set(key, data);
		}
	}

	static join(...args: MethodDecorator[]): MethodDecorator {
		return (target, property, descriptor) => args.forEach(arg => arg(target, property, descriptor));
	}
}