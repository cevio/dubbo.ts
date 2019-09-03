"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const channel_1 = require("./channel");
const utils_1 = require("../utils");
const url = require("url");
const intersect = require('@evio/intersect');
class Invoker {
    constructor(consumer, interfacename, interfaceversion, interfacegroup) {
        this.channels = new Map();
        this.consumer = consumer;
        this.interfacename = interfacename;
        this.interfaceversion = interfaceversion;
        this.interfacegroup = interfacegroup;
    }
    async close() {
        for (const [id, channel] of this.channels) {
            await channel.uninstall();
        }
        this.unRegister();
    }
    async remove(channel) {
        const host = channel.host;
        if (this.channels.has(host))
            this.channels.delete(host);
        if (this.channels.size === 0) {
            this.consumer.remove(this);
            await this.unRegister();
        }
    }
    async register() {
        const obj = {
            protocol: "consumer",
            slashes: true,
            host: `${utils_1.localhost}/${this.interfacename}`,
            query: {
                application: this.consumer.application,
                category: "consumers",
                dubbo: this.consumer.version,
                interface: this.interfacename,
                pid: this.consumer.pid,
                revision: this.interfaceversion,
                side: 'consumer',
                timestamp: Date.now(),
                version: this.interfaceversion,
                group: this.interfacegroup,
            }
        };
        if (obj.query.group === '-')
            delete obj.query.group;
        const dubboInterfaceURL = url.format(obj);
        const interface_root_path = `/${this.consumer.root}/${this.interfacename}`;
        const interface_dir_path = interface_root_path + '/consumers';
        const interface_entry_path = interface_dir_path + '/' + encodeURIComponent(dubboInterfaceURL);
        await this.consumer.registry.create(interface_root_path, utils_1.CREATE_MODES.PERSISTENT);
        await this.consumer.registry.create(interface_dir_path, utils_1.CREATE_MODES.PERSISTENT);
        await this.consumer.registry.create(interface_entry_path, utils_1.CREATE_MODES.EPHEMERAL);
        this.zooKeeperRegisterRootPath = interface_root_path + '/providers';
        this.zooKeeperRegisterPath = interface_entry_path;
        this.consumer.logger.info('[Consumer Register]', this.interfacename + ':', dubboInterfaceURL);
        return this;
    }
    unRegister() {
        if (this.zooKeeperRegisterPath) {
            return this.consumer.registry.remove(this.zooKeeperRegisterPath);
        }
    }
    async subscribe(id) {
        return await this.setupChannels(await this.getChildrenListFromZooKeeper(id));
    }
    async notify(id, event) {
        switch (event.getName()) {
            case 'NODE_CREATED':
            case 'NODE_DELETED':
            case 'NODE_DATA_CHANGED': return this.consumer.logger.debug('[DUBBO ZOOKEEPER NOTIFY]', event.getName(), event);
            case 'NODE_CHILDREN_CHANGED': return await this.setupChannels(await this.getChildrenListFromZooKeeper(id));
        }
    }
    async getChildrenListFromZooKeeper(id) {
        const list = await this.consumer.registry.children(this.zooKeeperRegisterRootPath, event => this.notify(id, event));
        if (!list)
            return [];
        const result = [];
        list.forEach(item => {
            const URI = url.parse(decodeURIComponent(item), true);
            const matchInterfaceName = URI.query.interface === this.interfacename;
            const matchInterfaceVersion = URI.query.version === this.interfaceversion;
            const matchInterfaceGroup = (URI.query['default.grouop'] || '') === (this.interfacegroup === '-' ? '' : this.interfacegroup);
            this.consumer.logger.debug('------------', URI.host, '------------');
            this.consumer.logger.debug('Match name:', matchInterfaceName, URI.query.interface, this.interfacename);
            this.consumer.logger.debug('Match version:', matchInterfaceVersion, URI.query.version, this.interfaceversion);
            this.consumer.logger.debug('Match group:', matchInterfaceGroup, (URI.query['default.grouop'] || ''), (this.interfacegroup === '-' ? '' : this.interfacegroup));
            if (matchInterfaceName && matchInterfaceVersion && matchInterfaceGroup)
                result.push(URI);
        });
        this.consumer.logger.debug('[Consumer Registry]', 'find vaild service:', result.length);
        return result;
    }
    async setupChannels(list) {
        if (!list.length)
            return 0;
        const current = new Map();
        list.forEach(l => current.set(l.host, l));
        const oldKeys = Array.from(this.channels.keys());
        const newKeys = list.map(item => item.host);
        const { adds, removes, commons } = intersect(oldKeys, newKeys);
        const task = [];
        adds.forEach((one) => {
            const channel = new channel_1.default(this);
            const target = current.get(one);
            this.consumer.logger.debug('[DUBBO INVOKER ADDONE]', target.href);
            task.push(channel.install(target).then(() => this.channels.set(target.host, channel)));
        });
        removes.forEach((one) => {
            if (this.channels.has(one)) {
                const channel = this.channels.get(one);
                this.channels.delete(one);
                this.consumer.logger.debug('[DUBBO INVOKER REMOVE]', channel.href);
                task.push(channel.uninstall());
            }
        });
        commons.forEach((one) => {
            if (this.channels.has(one)) {
                const target = this.channels.get(one);
                this.consumer.logger.debug('[DUBBO INVOKER MODIFY]', target.href);
                task.push(target.setup(current.get(one)));
            }
        });
        await Promise.all(task);
        return list.length;
    }
    async invoke(method, args) {
        let providers = Array.from(this.channels.values());
        if (providers.length === 0) {
            providers = await new Promise(resolve => {
                const time = Date.now();
                const timer = setInterval(() => {
                    if (Date.now() - time >= this.consumer.pick_timeout) {
                        clearInterval(timer);
                        return resolve([]);
                    }
                    const _providers = Array.from(this.channels.values());
                    if (_providers.length) {
                        clearInterval(timer);
                        return resolve(_providers);
                    }
                }, 10);
            });
        }
        if (providers.length === 0)
            throw new Error('no providers.');
        if (providers.length === 1)
            return this.resolveInvokeResult(await this.oneRetry(method, args, providers[0], 0));
        const usedChannels = [];
        providers.reduce((a, b) => {
            if (a && (a.retries !== b.retries))
                throw new Error('service channel got defferent retires value');
            return b;
        });
        return this.resolveInvokeResult(await this.manyRetry(method, args, providers, usedChannels, 0));
    }
    async manyRetry(method, args, providers, usedChannels, count) {
        let _channel = null;
        if (providers.length === usedChannels.length)
            usedChannels = [];
        for (let i = 0; i < providers.length; i++) {
            const channel = providers[i];
            const index = usedChannels.indexOf(channel);
            if (index > -1)
                continue;
            if (!_channel) {
                _channel = channel;
                continue;
            }
            if (channel.busies < _channel.busies)
                _channel = channel;
        }
        usedChannels.push(_channel);
        const retries = _channel.retries;
        const result = await _channel.invoke(method, args);
        if (result.code !== 408)
            return result;
        if (count < retries)
            return await this.manyRetry(method, args, providers, usedChannels, count + 1);
        return result;
    }
    async oneRetry(method, args, channel, count) {
        const retries = channel.retries;
        const result = await channel.invoke(method, args);
        if (result.code !== 408)
            return result;
        if (count < retries)
            return await this.oneRetry(method, args, channel, count + 1);
        return result;
    }
    resolveInvokeResult(result) {
        if (result.code !== 200)
            throw new Error(result.message);
        return result.data;
    }
}
exports.default = Invoker;
