(function initializeReleaseConfig(root) {
  const version = '2.9.0-combat';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'core-combat-depth',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
