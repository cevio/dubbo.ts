type TEvent = Record<string, any[]>;

export class Events<E extends TEvent> extends Map<keyof E, Set<((...args: E[keyof E]) => Promise<void>)>> {

  public on<T extends keyof E>(type: T, callback: (...args: E[T]) => Promise<void>) {
    if (!this.has(type)) this.set(type, new Set());
    const chunk = this.get(type);
    if (!chunk.has(callback)) chunk.add(callback);
    return this;
  }

  public async emitSync<T extends keyof E>(type:T, ...args: E[T]) {
    if (this.has(type)) {
      const chunk = this.get(type);
      for (const item of chunk) {
        await item(...args);
      }
    } else if (type === 'error') {
      throw new Error(args[0]);
    }
    return this;
  }

  public async emitAsync<T extends keyof E>(type:T, ...args: E[T]) {
    if (this.has(type)) {
      const chunk = this.get(type);
      await Promise.all(Array.from(chunk.values()).map(item => item(...args)));
    } else if (type === 'error') {
      throw new Error(args[0]);
    }
    return this;
  }

  public off<T extends keyof E>(type: T, handler?: (...args: E[T]) => Promise<void>) {
    if (this.has(type)) {
      const chunk = this.get(type);
      if (handler && chunk.has(handler)) {
        chunk.delete(handler);
        if (chunk.size === 0) {
          this.delete(type);
        }
      } else {
        this.delete(type);
      }
    }
    return this;
  }
}