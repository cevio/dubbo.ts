"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const utils_2 = require("@nelts/utils");
const invoker_1 = require("./invoker");
const url = require("url");
class Consumers extends utils_2.EventEmitter {
    constructor(options) {
        super();
        this._services = new Map();
        this._uris = [];
        this._application = options.application;
        this._root = options.root || 'dubbo';
        this._version = options.dubbo_version;
        this._registry = options.registry;
        this._pid = options.pid;
        this._heartbeat = options.heartbeat || 60000;
        this._heartbeat_timeout = options.heartbeatTimeout || this._heartbeat * 3;
        this._logger = options.logger || console;
        this._pick_timeout = options.pickTimeout || 3000;
    }
    get pickTimeout() {
        return this._pick_timeout;
    }
    get logger() {
        return this._logger;
    }
    get version() {
        return this._version;
    }
    get application() {
        return this._application;
    }
    get root() {
        return this._root;
    }
    get heartbeat() {
        return this._heartbeat;
    }
    get heartbeatTimeout() {
        return this._heartbeat_timeout;
    }
    close(callback) {
        for (const [id, invoker] of this._services)
            invoker.close();
        Promise.all(this._uris.map(uri => utils_1.zookeeperRemoveNode(this._registry, uri)))
            .then(() => callback(null))
            .catch(e => callback(e));
    }
    whenServiceChange(id, event) {
        switch (event.getName()) {
            case 'NODE_CREATED': return this.NODE_CREATED(id, event);
            case 'NODE_DELETED': return this.NODE_DELETED(id, event);
            case 'NODE_DATA_CHANGED': return this.NODE_DATA_CHANGED(id, event);
            case 'NODE_CHILDREN_CHANGED': return this.NODE_CHILDREN_CHANGED(id, event);
        }
    }
    NODE_CREATED(id, event) {
    }
    NODE_DELETED(id, event) {
    }
    NODE_DATA_CHANGED(id, event) {
    }
    async NODE_CHILDREN_CHANGED(id, event) {
        const list = await new Promise((resolve, reject) => {
            this._registry.zk.getChildren(event.path, (event) => this.whenServiceChange(id, event), (err, children, stat) => {
                if (err)
                    return reject(err);
                if (stat)
                    return resolve(children);
            });
        });
        if (list.length && this._services.has(id)) {
            const invoker = this._services.get(id);
            const URIS = [];
            for (let i = 0; i < list.length; i++) {
                const URI = url.parse(decodeURIComponent(list[i]), true);
                if (URI.query.interface === invoker.interface && URI.query.version === invoker.version && (URI.query['default.grouop'] || '') === invoker.group) {
                    URIS.push(URI);
                }
            }
            await invoker.check(URIS);
        }
    }
    async create(interfacename, version, group) {
        group = group || '';
        version = version || '0.0.0';
        const id = `${interfacename}:${version}@${group || ''}`;
        if (this._services.has(id))
            return this._services.get(id);
        const invoker = new invoker_1.default(this, interfacename, version, group);
        this._services.set(id, invoker);
        const host = utils_1.ip();
        const { interface_root_path, interface_dir_path, interface_entry_path } = utils_1.ConsumerRegisterUri(this._root, host, this._application, this._version, this._pid, {
            interface: interfacename,
            version,
            group
        });
        if (!(await utils_1.zookeeperExistsNode(this._registry, interface_root_path)))
            throw new Error('cannot find Provider of ' + interfacename);
        await utils_1.zookeeperCreateNode(this._registry, interface_dir_path, utils_1.CREATE_MODES.PERSISTENT);
        await utils_1.zookeeperCreateNode(this._registry, interface_entry_path, utils_1.CREATE_MODES.EPHEMERAL);
        this._uris.push(interface_entry_path);
        const list = await new Promise((resolve, reject) => {
            this._registry.zk.getChildren(interface_root_path + '/providers', (event) => this.whenServiceChange(id, event), (err, children, stat) => {
                if (err)
                    return reject(err);
                if (stat)
                    return resolve(children);
                return reject(new Error('cannot find Provider of ' + interfacename));
            });
        });
        if (list.length) {
            const URIS = [];
            for (let i = 0; i < list.length; i++) {
                const URI = url.parse(decodeURIComponent(list[i]), true);
                if (URI.query.interface === interfacename && URI.query.version === version && (URI.query['default.grouop'] || '') === group) {
                    URIS.push(URI);
                }
            }
            if (URIS.length)
                await Promise.all(URIS.map(uri => invoker.push(uri)));
        }
        return invoker;
    }
}
exports.default = Consumers;
