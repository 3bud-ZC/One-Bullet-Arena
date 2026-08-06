import './release-config.js';

const release = globalThis.ONE_BULLET_RELEASE;
if (!release) throw new Error('Release configuration failed to initialize.');

export const RELEASE_INFO = release;
export const RELEASE_VERSION = release.version;
export const RELEASE_LABEL = release.label;
export const RELEASE_CACHE_NAME = release.cacheName;
