(function initializeReleaseConfig(root) {
  const version = '3.7.0-hires-ui';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'hires-ui',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
