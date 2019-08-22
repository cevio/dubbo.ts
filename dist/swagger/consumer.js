"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SwaggerConsumer {
    constructor(subject, registry) {
        this.subject = subject;
        this.subjectRootPath = `/swagger/${this.subject}`;
        this.registry = registry;
    }
    async get() {
        const res = {};
        const interfaces = await this.registry.children(this.subjectRootPath);
        await Promise.all(interfaces.map(inter => {
            return this.registry.children(this.subjectRootPath + '/' + inter + '/exports').then(items => {
                const value = items.map(item => JSON.parse(Buffer.from(decodeURIComponent(item), 'base64').toString('utf8')));
                res[inter] = value;
            }).catch(Promise.resolve);
        }));
        return res;
    }
}
exports.default = SwaggerConsumer;
