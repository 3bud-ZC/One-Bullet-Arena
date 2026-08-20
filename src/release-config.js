(function initializeReleaseConfig(root) {
  const version = '3.16.0-mobile-combat';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'smooth-runtime',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
