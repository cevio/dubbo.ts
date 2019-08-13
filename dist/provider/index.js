"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const net = require("net");
const utils_1 = require("@nelts/utils");
const interface_1 = require("./interface");
const utils_2 = require("../utils");
const connection_1 = require("./connection");
class Provider extends utils_1.EventEmitter {
    constructor(options) {
        super();
        this._services = [];
        this._conns = [];
        this._services_map = {};
        this._application = options.application;
        this._root = options.root || 'dubbo';
        this._version = options.dubbo_version;
        this._registry = options.registry;
        this._port = options.port;
        this._pid = options.pid;
        this._logger = options.logger || console;
        this._heartbeat = options.heartbeat || 60000;
        this._heartbeat_timeout = options.heartbeatTimeout || this._heartbeat * 3;
        if (this._heartbeat_timeout <= this._heartbeat)
            throw new Error('heartbeat_timeout <= heartbeat is wrong');
        this.on('drop', async (conn) => {
            const index = this._conns.indexOf(conn);
            if (index > -1) {
                this._conns.splice(index, 1);
                await conn.destroy();
            }
        });
    }
    get logger() {
        return this._logger;
    }
    get heartbeat() {
        return this._heartbeat;
    }
    get heartbeatTimeout() {
        return this._heartbeat_timeout;
    }
    get tcp() {
        return this._tcp;
    }
    get version() {
        return this._version;
    }
    get services() {
        return this._services_map;
    }
    addService(data) {
        const service = new interface_1.default(data);
        const group = service.serviceGroup || '-';
        const version = service.serviceVersion;
        const interfacename = service.serviceInterface;
        if (!this._services_map[group])
            this._services_map[group] = {};
        if (!this._services_map[group][interfacename])
            this._services_map[group][interfacename] = {};
        if (this._services_map[group][interfacename][version]) {
            throw new Error(`service interface[${interfacename}:${version}@${group || '-'}] has already exists.`);
        }
        this._services_map[group][interfacename][version] = service;
        this._services.push(service);
        return this;
    }
    connect(socket) {
        const conn = new connection_1.default(this, socket);
        conn.on('packet', (ctx) => this.sync('packet', ctx));
        this._conns.push(conn);
    }
    async publish() {
        const host = utils_2.ip() + ':' + this._port;
        this._register_uris = await Promise.all(this._services.map(async (service) => {
            const { interface_root_path, interface_dir_path, interface_entry_path, } = utils_2.ProviderRegisterUri(this._root, host, this._application, this._version, this._pid, this._heartbeat, {
                interface: service.serviceInterface,
                version: service.serviceVersion,
                revision: service.serviceRevision,
                group: service.serviceGroup,
                delay: service.serviceDefaultDeplay,
                retries: service.serviceDefaultRetries,
                timeout: service.serviceDefaultTimeout,
                methods: service.serviceMethods,
            });
            await utils_2.zookeeperCreateNode(this._registry, interface_root_path, utils_2.CREATE_MODES.PERSISTENT);
            await utils_2.zookeeperCreateNode(this._registry, interface_dir_path, utils_2.CREATE_MODES.PERSISTENT);
            await utils_2.zookeeperCreateNode(this._registry, interface_entry_path, utils_2.CREATE_MODES.EPHEMERAL);
            return interface_entry_path;
        }));
        return this;
    }
    unPublish() {
        return Promise.all(this._register_uris.map(uri => utils_2.zookeeperRemoveNode(this._registry, uri)));
    }
    async destroy() {
        await Promise.all(this._conns.map(conn => conn.destroy()));
        await this.unPublish();
        this._tcp && this._tcp.close();
        this._registry && this._registry.destory();
    }
    listen(port, ...args) {
        this._tcp = net.createServer();
        this._tcp.on('connection', (socket) => this.connect(socket));
        this.publish().then(() => this._tcp.listen(port, ...args));
    }
    close(callback) {
        this.destroy()
            .then(() => callback())
            .catch(e => callback(e));
    }
}
exports.default = Provider;
