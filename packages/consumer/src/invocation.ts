export class Invocation {
  private stacks: Map<string, {
    status: 0 | 1 | 2 | 3,
    error?: Error,
    data: { 
      resolve: () => void, 
      reject: (e: Error) => void,
    }[]
  }> = new Map();

  public async fetch(id: string, callback: () => Promise<void>) {
    if (!this.stacks.has(id)) {
      this.stacks.set(id, {
        status: 0,
        data: [],
      });
    }
    const stack = this.stacks.get(id);
    switch (stack.status) {
      case 0:
        stack.status = 1;
        await callback().catch(e => {
          stack.status = 3;
          stack.error = e;
          stack.data.forEach(dat => dat.reject(e));
          return Promise.reject(e);
        });
        stack.status = 2;
        stack.data.forEach(dat => dat.resolve());
        break;
      case 1:
        await new Promise<void>((resolve, reject) => stack.data.push({ resolve, reject }));
        break;
      case 3:
        throw stack.error;
    }
  }
}