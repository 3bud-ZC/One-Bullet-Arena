(function initializeReleaseConfig(root) {
  const version = '3.0.0-checkpoint';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'checkpoint-progression',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
