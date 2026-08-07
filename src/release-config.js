(function initializeReleaseConfig(root) {
  const version = '3.3.0-visual-overhaul';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'cinematic-visual-overhaul',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);