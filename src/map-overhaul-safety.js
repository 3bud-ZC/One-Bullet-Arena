const SAFE_RELAY_POSITIONS = Object.freeze([
  Object.freeze({ x: 150, y: 310 }),
  Object.freeze({ x: 1130, y: 310 }),
  Object.freeze({ x: 640, y: 205 }),
  Object.freeze({ x: 640, y: 515 }),
]);

export function safeRelayPosition(index = 0) {
  const safeIndex = Math.max(0, Math.trunc(Number(index) || 0)) % SAFE_RELAY_POSITIONS.length;
  return { ...SAFE_RELAY_POSITIONS[safeIndex] };
}

function repositionRelays(game) {
  const relays = game.mapOverhaulState?.relays;
  if (!Array.isArray(relays)) return;
  relays.forEach((relay, index) => Object.assign(relay, safeRelayPosition(index)));
}

export function installMapOverhaulSafety(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__mapOverhaulSafetyInstalled) return;
  prototype.__mapOverhaulSafetyInstalled = true;

  const previousSpawnNextWave = prototype.spawnNextWave;
  prototype.spawnNextWave = function spawnMapWithSafeRelays(...args) {
    const result = previousSpawnNextWave.apply(this, args);
    repositionRelays(this);
    return result;
  };

  const previousStartBoss = prototype.startBoss;
  prototype.startBoss = function startBossWithSafeRelays(...args) {
    const result = previousStartBoss.apply(this, args);
    repositionRelays(this);
    return result;
  };
}
