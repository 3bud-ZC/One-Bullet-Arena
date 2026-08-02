import { PROGRESSION_STORAGE_KEY, normalizeSave } from './progression-data.js';
import { cosmeticById, deriveCosmeticUnlocks } from './replayability-data.js';

export function settleReplayabilityProgress(inputSave, options = {}) {
  const save = normalizeSave(inputSave);
  const summary = options.summary;
  const metrics = options.metrics || {};
  const runId = options.runId || '';
  const activeCoreId = options.activeCoreId || 'standard';
  if (!summary?.challenge) return { save, newCosmetics: [], settled: false };

  const run = save.history.find((item) => item.id === runId) || save.history[0] || null;
  const alreadySettled = Boolean(
    run
    && run.challengeId === summary.challenge.id
    && run.challengeCompleted === Boolean(summary.completed)
    && run.legendaryPicks === Number(metrics.legendaryPicks || 0)
    && run.eliteKills === Number(metrics.eliteKills || 0),
  );
  if (alreadySettled) return { save, newCosmetics: [], settled: false };

  const bonus = Math.max(0, Number(summary.bonus) || 0);
  save.shards += bonus;
  save.stats.totalShardsEarned += bonus;
  if (summary.completed) {
    save.replayability.challengeCompletions[summary.challenge.id] = (save.replayability.challengeCompletions[summary.challenge.id] || 0) + 1;
    save.replayability.totals.challengesCompleted += 1;
  }
  save.replayability.totals.legendaryPicks += Math.max(0, Number(metrics.legendaryPicks) || 0);
  save.replayability.totals.eliteKills += Math.max(0, Number(metrics.eliteKills) || 0);

  if (run) {
    run.challengeId = summary.challenge.id;
    run.challengeCompleted = Boolean(summary.completed);
    run.daily = Boolean(summary.daily);
    run.eliteKills = Math.max(0, Number(metrics.eliteKills) || 0);
    run.legendaryPicks = Math.max(0, Number(metrics.legendaryPicks) || 0);
    run.coreId = activeCoreId;
    run.shards += bonus;
  }

  const before = new Set(save.replayability.unlockedCosmetics);
  for (const id of deriveCosmeticUnlocks(save.replayability)) {
    if (!before.has(id)) save.replayability.unlockedCosmetics.push(id);
  }
  const newCosmetics = save.replayability.unlockedCosmetics
    .filter((id) => !before.has(id))
    .map(cosmeticById)
    .filter(Boolean);
  save.updatedAt = new Date().toISOString();
  return { save, newCosmetics, settled: true };
}

export function installReplayabilityPersistence(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__replayabilityPersistenceInstalled) return;
  prototype.__replayabilityPersistenceInstalled = true;

  const originalResetRun = prototype.resetRun;
  prototype.resetRun = function resetReplayabilitySettlement(...args) {
    const result = originalResetRun.apply(this, args);
    this.replayabilitySettlementApplied = false;
    return result;
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishRunWithSettledReplayability(victory) {
    const result = originalFinishRun.call(this, victory);
    if (this.replayabilitySettlementApplied || !this.lastReplayabilitySummary) return result;
    this.replayabilitySettlementApplied = true;
    const runId = this.lastProgressionReward?.run?.id || this.progressionSave?.history?.[0]?.id || '';
    const settled = settleReplayabilityProgress(this.progressionSave, {
      summary: this.lastReplayabilitySummary,
      metrics: this.replayMetrics,
      runId,
      activeCoreId: this.activeCoreId,
    });
    this.progressionSave = settled.save;
    if (this.lastProgressionReward?.run) {
      const historyRun = settled.save.history.find((item) => item.id === runId) || settled.save.history[0];
      if (historyRun) Object.assign(this.lastProgressionReward.run, historyRun);
      this.lastProgressionReward.reward = this.lastProgressionReward.run.shards;
    }
    if (settled.newCosmetics.length) {
      const known = new Set((this.lastReplayabilitySummary.newCosmetics || []).map((item) => item.id));
      this.lastReplayabilitySummary.newCosmetics = [
        ...(this.lastReplayabilitySummary.newCosmetics || []),
        ...settled.newCosmetics.filter((item) => !known.has(item.id)),
      ];
    }
    if (typeof localStorage !== 'undefined') localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(settled.save));
    return result;
  };

  const originalDrawMenu = prototype.drawMenu;
  prototype.drawMenu = function drawCurrentBuildVersion(...args) {
    originalDrawMenu.apply(this, args);
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 17, 0.94)';
    ctx.fillRect(480, 40, 320, 30);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#62f3ff';
    ctx.font = '800 13px Changa, "Segoe UI", sans-serif';
    ctx.fillText('ONE BULLET ARENA  •  v0.6.0', 640, 61);
    ctx.restore();
  };
}
