(function initializeReleaseConfig(root) {
  const version = '3.5.1-ui-repair';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'ui-repair',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
