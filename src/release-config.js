(function initializeReleaseConfig(root) {
  const version = '3.4.0-expanding-world';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'expanding-world',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
