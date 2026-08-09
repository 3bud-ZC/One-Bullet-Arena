(function initializeReleaseConfig(root) {
  const version = '3.6.1-ui-refinement';
  const release = Object.freeze({
    version,
    label: `v${version}`,
    channel: 'global-ui',
    cacheName: `one-bullet-arena-v${version}`,
    schemaVersion: 1,
  });

  root.ONE_BULLET_RELEASE = release;
})(globalThis);
