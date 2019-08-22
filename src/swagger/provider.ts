import Provider from '../provider';
import ProviderChunk from '../provider/chunk';
import { SwaggerBase64DataType, CREATE_MODES, Logger } from '../utils';
export default class SwaggerProvider {
  private provider: Provider;
  private readonly subject: string;
  private readonly subjectRootPath: string;
  private publishedNodes: string[] = [];
  private logger: Logger;
  constructor(subject: string, provider: Provider, logger?: Logger) {
    this.provider = provider;
    this.subject = subject;
    this.subjectRootPath = `/swagger/${this.subject}`;
    this.logger = logger || console;
  }

  async publish() {
    await this.provider.registry.create('/swagger', CREATE_MODES.PERSISTENT);
    await this.provider.registry.create(this.subjectRootPath, CREATE_MODES.PERSISTENT);
    for (const [id, chunk] of this.provider.storage) {
      if (!chunk.interfacemethodparameters) continue;
      await this.provider.registry.create(this.subjectRootPath + '/' + chunk.interfacename, CREATE_MODES.PERSISTENT);
      await this.provider.registry.create(this.subjectRootPath + '/' + chunk.interfacename + '/exports', CREATE_MODES.PERSISTENT);
      const node_path = this.subjectRootPath + '/' + chunk.interfacename + '/exports/' + this.format(chunk);
      await this.provider.registry.create(node_path, CREATE_MODES.EPHEMERAL);
      this.publishedNodes.push(node_path);
      this.logger.info('[Swagger Register]', id, node_path);
    }
  }

  async unPublish() {
    await Promise.all(this.publishedNodes.map(node => this.provider.registry.remove(node)));
  }

  private format(chunk: ProviderChunk) {
    const res: SwaggerBase64DataType = { methods: {} };
    res.description = chunk.interfacedescription;
    res.group = chunk.interfacegroup;
    res.version = chunk.interfaceversion;
    res.methods = chunk.interfacemethodparameters;
    return Buffer.from(JSON.stringify(res), 'utf8').toString('base64');
  }
}