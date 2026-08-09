function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function setAttributeIfChanged(element, name, value) {
  if (!element) return false;
  const text = String(value);
  if (element.getAttribute(name) === text) return false;
  element.setAttribute(name, text);
  return true;
}

export function installDomPerformanceBridge(controller) {
  if (!controller?.root) return null;
  const root = controller.root;
  const gauges = new Map(
    [...root.querySelectorAll('[data-gauge]')].map((element) => [element.dataset.gauge, element]),
  );
  const minimap = root.querySelector('[data-minimap]');
  const trailElement = root.querySelector('[data-minimap-trail]');
  const viewportElement = root.querySelector('[data-minimap-viewport]');
  const playerElement = root.querySelector('[data-minimap-player]');
  const shieldIndicator = root.querySelector('[data-shield-indicator]');
  const toolbar = root.querySelector('[data-toolbar]');
  const settingsPopover = root.querySelector('[data-settings-popover]');
  const audioButton = root.querySelector('[data-action="audio"]');
  const progressionLine = root.querySelector('[data-progress-line]');

  const stats = {
    gaugeWrites: 0,
    minimapTrailRebuilds: 0,
    minimapMarkerWrites: 0,
  };
  let trailSignature = '';
  let cachedBoundsSignature = '';
  let projectedTrail = '';

  controller.performanceElements = Object.freeze({
    gauges,
    minimap,
    trailElement,
    viewportElement,
    playerElement,
    shieldIndicator,
    toolbar,
    settingsPopover,
    audioButton,
    progressionLine,
  });

  controller.setGauge = (name, value) => {
    const element = gauges.get(name);
    if (!element) return;
    const next = clamp01(value).toFixed(4);
    if (element.style.getPropertyValue('--value') === next) return;
    element.style.setProperty('--value', next);
    stats.gaugeWrites += 1;
  };

  controller.syncMinimap = () => {
    const game = controller.game;
    const bounds = game.arenaStage?.bounds;
    const shouldShow = Boolean(bounds && (game.arenaStage?.id || 0) >= 4 && !game.touchMode);
    if (minimap && minimap.hidden !== !shouldShow) minimap.hidden = !shouldShow;
    if (!shouldShow) return;

    const width = Math.max(1, Number(bounds.w) || 1);
    const height = Math.max(1, Number(bounds.h) || 1);
    const projectX = (x) => clamp01(((Number(x) || 0) - bounds.x) / width) * 158 + 1;
    const projectY = (y) => clamp01(((Number(y) || 0) - bounds.y) / height) * 94 + 1;
    const trail = game.explorationTrail || [];
    const last = trail.at?.(-1) || trail[trail.length - 1];
    const boundsSignature = `${bounds.x}:${bounds.y}:${width}:${height}`;
    const nextTrailSignature = `${trail.length}:${Number(last?.x || 0).toFixed(1)}:${Number(last?.y || 0).toFixed(1)}:${boundsSignature}`;

    if (nextTrailSignature !== trailSignature || boundsSignature !== cachedBoundsSignature) {
      projectedTrail = trail.map((point, index) => {
        const x = projectX(point?.x).toFixed(2);
        const y = projectY(point?.y).toFixed(2);
        return `${index ? 'L' : 'M'}${x} ${y}`;
      }).join(' ');
      setAttributeIfChanged(trailElement, 'd', projectedTrail);
      trailSignature = nextTrailSignature;
      cachedBoundsSignature = boundsSignature;
      stats.minimapTrailRebuilds += 1;
    }

    const viewport = game.viewportWorldBounds?.();
    if (viewport && viewportElement) {
      const viewW = Math.max(1, Math.min(158, (viewport.w / width) * 158));
      const viewH = Math.max(1, Math.min(94, (viewport.h / height) * 94));
      const x = Math.max(1, Math.min(159 - viewW, projectX(viewport.x))).toFixed(2);
      const y = Math.max(1, Math.min(95 - viewH, projectY(viewport.y))).toFixed(2);
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'x', x));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'y', y));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'width', viewW.toFixed(2)));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(viewportElement, 'height', viewH.toFixed(2)));
    }

    if (playerElement) {
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(playerElement, 'cx', projectX(game.player?.x).toFixed(2)));
      stats.minimapMarkerWrites += Number(setAttributeIfChanged(playerElement, 'cy', projectY(game.player?.y).toFixed(2)));
    }
    const sector = controller.bindings?.get?.('minimap-sector');
    const sectorText = String((game.arenaStage?.id || 0) + 1).padStart(2, '0');
    if (sector && sector.textContent !== sectorText) sector.textContent = sectorText;
  };

  return Object.freeze({
    getSnapshot() {
      return {
        cachedGaugeCount: gauges.size,
        minimapTrailRebuilds: stats.minimapTrailRebuilds,
        minimapMarkerWrites: stats.minimapMarkerWrites,
        gaugeWrites: stats.gaugeWrites,
      };
    },
  });
}
