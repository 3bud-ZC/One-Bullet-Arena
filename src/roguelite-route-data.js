export const PROTOCOL_REGIONS = Object.freeze(['neon', 'forge', 'void']);

export const ROUTE_NODE_TYPES = Object.freeze({
  combat: { id: 'combat', name: 'قتال', icon: '◆', color: '#62f3ff', reward: 24 },
  elite: { id: 'elite', name: 'نخبة', icon: '✦', color: '#ff526a', reward: 48 },
  forge: { id: 'forge', name: 'المسبك', icon: '⬢', color: '#ff9f43', reward: 0 },
  shop: { id: 'shop', name: 'متجر النواة', icon: '◇', color: '#ffe66d', reward: 0 },
  recovery: { id: 'recovery', name: 'استراحة', icon: '◎', color: '#53f2a1', reward: 0 },
  mystery: { id: 'mystery', name: 'حدث غامض', icon: '?', color: '#b983ff', reward: 0 },
  challenge: { id: 'challenge', name: 'غرفة تحدٍ', icon: '!', color: '#ff79d1', reward: 54 },
  boss: { id: 'boss', name: 'حارس المنطقة', icon: '⬟', color: '#ffffff', reward: 80 },
});

export const PROTOCOL_CHALLENGES = Object.freeze([
  { id: 'no-damage', name: 'زجاج نقي', description: 'أنهِ المواجهة دون تلقي ضرر.', bonus: 24 },
  { id: 'limited-shots', name: 'ذخيرة محسوبة', description: 'أنهِ المواجهة في 12 إطلاقًا أو أقل.', bonus: 22 },
  { id: 'ricochet-hunt', name: 'سيد الجدران', description: 'حقق 6 ارتدادات على الأقل.', bonus: 20 },
]);

export const SERVICE_OPTIONS = Object.freeze({
  forge: [
    { id: 'forge-bounce', name: 'شحنة ممتدة', description: '+2 ارتداد لهذه الجولة.', cost: 36, effect: 'extended-charge' },
    { id: 'forge-damage', name: 'نواة ثقيلة', description: '+1 ضرر أساسي لهذه الجولة.', cost: 42, effect: 'heavy-core' },
    { id: 'forge-recall', name: 'استدعاء مغناطيسي', description: 'يفتح الاستدعاء أو يقويه.', cost: 38, effect: 'magnetic-recall' },
  ],
  shop: [
    { id: 'shop-heal', name: 'ترميم الهيكل', description: 'استعد قلبًا واحدًا.', cost: 28, effect: 'heal' },
    { id: 'shop-shield', name: 'درع مؤقت', description: 'ابدأ المواجهة القادمة بدرع.', cost: 34, effect: 'shield' },
    { id: 'shop-upgrade', name: 'مخطط عشوائي', description: 'احصل على ترقية عشوائية.', cost: 46, effect: 'random-upgrade' },
  ],
  mystery: [
    { id: 'mystery-risk', name: 'امتص الطاقة', description: '+70 طاقة مكسورة مقابل خسارة قلب.', cost: 0, effect: 'risk-energy' },
    { id: 'mystery-safe', name: 'فكك النواة', description: '+35 طاقة مكسورة دون مخاطرة.', cost: 0, effect: 'safe-energy' },
    { id: 'mystery-legend', name: 'احتفظ بالشظية', description: 'ترقية عشوائية مقابل 25 طاقة.', cost: 25, effect: 'random-upgrade' },
  ],
});

function hashSeed(value) {
  let hash = 2166136261;
  const text = String(value || 'corebreak');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const ROW_POOLS = Object.freeze([
  ['combat', 'combat', 'challenge'],
  ['elite', 'forge', 'shop'],
  ['combat', 'recovery', 'mystery'],
]);

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createProtocolRoute(seed = Date.now()) {
  const random = createSeededRandom(seed);
  const acts = PROTOCOL_REGIONS.map((regionId, actIndex) => {
    const rows = ROW_POOLS.map((pool, rowIndex) => {
      const types = shuffle(pool, random);
      return types.map((type, column) => ({
        id: `${regionId}-${rowIndex}-${column}-${type}`,
        type,
        regionId,
        actIndex,
        rowIndex,
        column,
        completed: false,
      }));
    });
    rows.push([{
      id: `${regionId}-boss`,
      type: 'boss',
      regionId,
      actIndex,
      rowIndex: 3,
      column: 1,
      completed: false,
    }]);
    return { regionId, actIndex, rows };
  });
  return {
    version: 1,
    seed: String(seed),
    acts,
    actIndex: 0,
    rowIndex: 0,
    brokenEnergy: 0,
    completedNodes: [],
    startedAt: new Date().toISOString(),
  };
}

export function currentRouteNodes(route) {
  const act = route?.acts?.[route.actIndex];
  return act?.rows?.[route.rowIndex] || [];
}

export function routeNodeById(route, nodeId) {
  for (const act of route?.acts || []) {
    for (const row of act.rows || []) {
      const node = row.find((item) => item.id === nodeId);
      if (node) return node;
    }
  }
  return null;
}

export function completeRouteNode(route, nodeId, bonus = 0) {
  const node = routeNodeById(route, nodeId);
  if (!node || node.completed) return route;
  node.completed = true;
  route.completedNodes.push(node.id);
  const baseReward = ROUTE_NODE_TYPES[node.type]?.reward || 0;
  route.brokenEnergy += Math.max(0, baseReward + Math.trunc(Number(bonus) || 0));
  if (node.type === 'boss') {
    route.actIndex += 1;
    route.rowIndex = 0;
  } else {
    route.rowIndex += 1;
  }
  return route;
}

export function canAffordRunPurchase(route, cost) {
  return Math.max(0, Number(route?.brokenEnergy) || 0) >= Math.max(0, Number(cost) || 0);
}

export function spendBrokenEnergy(route, cost) {
  const safeCost = Math.max(0, Math.trunc(Number(cost) || 0));
  if (!canAffordRunPurchase(route, safeCost)) return false;
  route.brokenEnergy -= safeCost;
  return true;
}

export function protocolComplete(route) {
  return Number(route?.actIndex) >= PROTOCOL_REGIONS.length;
}

export function selectProtocolChallenge(seed, actIndex, rowIndex) {
  const random = createSeededRandom(`${seed}:${actIndex}:${rowIndex}:challenge`);
  return PROTOCOL_CHALLENGES[Math.floor(random() * PROTOCOL_CHALLENGES.length)];
}
