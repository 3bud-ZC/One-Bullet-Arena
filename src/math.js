export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const length = (x, y) => Math.hypot(x, y);

export function normalize(x, y) {
  const magnitude = length(x, y);
  if (magnitude === 0) return { x: 0, y: 0 };
  return { x: x / magnitude, y: y / magnitude };
}

export const distanceSquared = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const circlesOverlap = (a, b, padding = 0) => {
  const radius = a.radius + b.radius + padding;
  return distanceSquared(a, b) <= radius * radius;
};

export function randomPointOutsideRadius(width, height, center, minDistance, margin, random = Math.random) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const point = {
      x: margin + random() * (width - margin * 2),
      y: margin + random() * (height - margin * 2),
    };
    if (distanceSquared(point, center) >= minDistance * minDistance) return point;
  }

  return { x: margin, y: margin };
}
