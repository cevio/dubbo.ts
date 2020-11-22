export function getFinger(host: string, port: number) {
  return host + ':' + port;
}

export function getRegistryFinger(name: string, options: { version?: string, group?: string } = {}) {
  const group = options.group || '*';
  const version = options.version || '0.0.0';
  return name + ':' + group + '@' + version;
}