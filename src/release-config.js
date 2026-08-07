(function initializeReleaseConfig(root) {
  const version = '3.2.0-true-2d';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'visual-world-2d',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
