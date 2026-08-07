(function initializeReleaseConfig(root) {
  const version = '3.1.0-a-warden';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'enemy-expansion-warden',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
