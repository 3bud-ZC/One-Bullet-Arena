(function initializeReleaseConfig(root) {
  const version = '2.8.0-a';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'release-stability-foundation',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
