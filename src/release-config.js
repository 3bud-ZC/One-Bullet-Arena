(function initializeReleaseConfig(root) {
  const version = '3.5.0-production-art';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'production-art',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
