"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
class SwaggerProvider {
    constructor(subject, provider, logger) {
        this.publishedNodes = [];
        this.provider = provider;
        this.subject = subject;
        this.subjectRootPath = `/swagger/${this.subject}`;
        this.logger = logger || console;
    }
    async publish() {
        await this.provider.registry.create('/swagger', utils_1.CREATE_MODES.PERSISTENT);
        await this.provider.registry.create(this.subjectRootPath, utils_1.CREATE_MODES.PERSISTENT);
        for (const [id, chunk] of this.provider.storage) {
            if (!chunk.interfacemethodparameters)
                continue;
            await this.provider.registry.create(this.subjectRootPath + '/' + chunk.interfacename, utils_1.CREATE_MODES.PERSISTENT);
            await this.provider.registry.create(this.subjectRootPath + '/' + chunk.interfacename + '/exports', utils_1.CREATE_MODES.PERSISTENT);
            const node_path = this.subjectRootPath + '/' + chunk.interfacename + '/exports/' + this.format(chunk);
            await this.provider.registry.create(node_path, utils_1.CREATE_MODES.EPHEMERAL);
            this.publishedNodes.push(node_path);
            this.logger.info('[Swagger Register]', id, node_path);
        }
    }
    async unPublish() {
        await Promise.all(this.publishedNodes.map(node => this.provider.registry.remove(node)));
    }
    format(chunk) {
        const res = { methods: [], host: null };
        res.description = chunk.interfacedescription;
        res.group = chunk.interfacegroup;
        res.version = chunk.interfaceversion;
        res.methods = chunk.interfacemethodparameters;
        res.host = chunk.host;
        return encodeURIComponent(Buffer.from(JSON.stringify(res), 'utf8').toString('base64'));
    }
}
exports.default = SwaggerProvider;
