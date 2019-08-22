import Provider from '../provider';
import { Logger } from '../utils';
export default class SwaggerProvider {
    private provider;
    private readonly subject;
    private readonly subjectRootPath;
    private publishedNodes;
    private logger;
    constructor(subject: string, provider: Provider, logger?: Logger);
    publish(): Promise<void>;
    unPublish(): Promise<void>;
    private format;
}
