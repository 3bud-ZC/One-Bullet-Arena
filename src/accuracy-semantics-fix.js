export function installAccuracySemanticsFix(GameClass) {
  const prototype = GameClass.prototype;
  if (prototype.__accuracySemanticsFixInstalled) return;
  prototype.__accuracySemanticsFixInstalled = true;

  const originalDamageEnemy = prototype.damageEnemy;
  prototype.damageEnemy = function damageEnemyWithStrictDirectImpact(enemy, damage, forceX, forceY, fromBullet) {
    const directBefore = Math.max(0, Number(this.stats?.directImpacts) || 0);
    const hpBefore = Number(enemy?.hp) || 0;
    const result = originalDamageEnemy.call(this, enemy, damage, forceX, forceY, fromBullet);
    const hpAfter = Number(enemy?.hp) || 0;
    this.stats.directImpacts = directBefore + (fromBullet && hpAfter < hpBefore ? 1 : 0);
    return result;
  };

  const originalDamageBoss = prototype.damageBoss;
  prototype.damageBoss = function damageBossWithStrictDirectImpact(damage, bypassShield = false) {
    const directBefore = Math.max(0, Number(this.stats?.directImpacts) || 0);
    const hpBefore = Number(this.boss?.hp) || 0;
    const result = originalDamageBoss.call(this, damage, bypassShield);
    const hpAfter = Number(this.boss?.hp) || 0;
    this.stats.directImpacts = directBefore + (!bypassShield && hpAfter < hpBefore ? 1 : 0);
    return result;
  };

  const originalFinishRun = prototype.finishRun;
  prototype.finishRun = function finishWithStrictDirectImpacts(victory) {
    this.stats.hits = Math.max(0, Number(this.stats.directImpacts) || 0);
    return originalFinishRun.call(this, victory);
  };
}
