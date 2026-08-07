(function initializeReleaseConfig(root) {
  const version = '3.4.0-combat-juice';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'combat-feel-and-juice',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);