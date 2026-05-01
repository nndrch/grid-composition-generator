function valueNoise(ix, iy, seed) {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.3) * 43758.5453;
  return n - Math.floor(n);
}

export function smoothNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = valueNoise(ix,     iy,     seed);
  const b = valueNoise(ix + 1, iy,     seed);
  const c = valueNoise(ix,     iy + 1, seed);
  const d = valueNoise(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy;
}

export function noiseWeightedPick(modules, noiseVal) {
  if (modules.length === 0) return null;
  const total = modules.reduce((s, m) => s + m.weight, 0);
  let t = noiseVal * total;
  for (const m of modules) {
    t -= m.weight;
    if (t <= 0) return m;
  }
  return modules[modules.length - 1];
}
