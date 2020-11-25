import 'reflect-metadata';

export class ClassMetaCreator {
	static namespace = Symbol('metadata.class.namespace');
	static initializeNamespace = Symbol('meta.class.initialize.namespace');
	private readonly stacks: Map<string | symbol, any> = new Map();

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
	
	static instance(obj: Object) {
		let meta: ClassMetaCreator;
		if (!Reflect.hasMetadata(ClassMetaCreator.namespace, obj)) {
			meta = new ClassMetaCreator();
			Reflect.defineMetadata(ClassMetaCreator.namespace, meta, obj);
		} else {
			meta = Reflect.getMetadata(ClassMetaCreator.namespace, obj) as ClassMetaCreator;
		}
		return meta;
	}

	static define<T = any>(key: string | symbol, value: T): ClassDecorator {
		return target => {
			const meta = ClassMetaCreator.instance(target);
			meta.set(key, value);
		}
	}

	static push(key: string | symbol, ...args: any[]): ClassDecorator {
		return target => {
			const meta = ClassMetaCreator.instance(target);
			const data = meta.has(key) ? meta.get<any[]>(key) : [];
			data.push(...args);
			meta.set(key, data);
		}
	}

	static unshift(key: string | symbol, ...args: any[]): ClassDecorator {
		return target => {
			const meta = ClassMetaCreator.instance(target);
			const data = meta.has(key) ? meta.get<any[]>(key) : [];
			data.unshift(...args);
			meta.set(key, data);
		}
	}

	static join(...args: ClassDecorator[]): ClassDecorator {
		return (target) => args.forEach(arg => arg(target));
	}
}