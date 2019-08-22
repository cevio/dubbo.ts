import Registery from '../registry';
export default class SwaggerConsumer {
  private readonly subject: string;
  private readonly subjectRootPath: string;
  private registry: Registery;
  constructor(subject: string, registry: Registery) {
    this.subject = subject;
    this.subjectRootPath = `/swagger/${this.subject}`;
    this.registry = registry;
  }

  async get() {
    const res: any = {};
    const interfaces: string[] = await this.registry.children(this.subjectRootPath);
    await Promise.all(interfaces.map(inter => {
      return this.registry.children(this.subjectRootPath + '/' + inter + '/exports').then(items => {
        const value = items.map(item => JSON.parse(Buffer.from(decodeURIComponent(item), 'base64').toString('utf8')));
        res[inter] = value;
      }).catch(Promise.resolve);
    }));
    return res;
  }
}