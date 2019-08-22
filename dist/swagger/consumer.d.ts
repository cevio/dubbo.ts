import Registery from '../registry';
export default class SwaggerConsumer {
    private readonly subject;
    private readonly subjectRootPath;
    private registry;
    constructor(subject: string, registry: Registery);
    get(): Promise<any>;
}
