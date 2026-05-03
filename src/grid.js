export function getWaveWeight(t, type, max, peak) {
  if (type === 'locked') return max;
  // 'unlocked' — sawtooth with min hardcoded to 1
  const min = 1;
  let dist = 0;
  if (peak === 0)      dist = 1 - t;
  else if (peak === 1) dist = t;
  else dist = t < peak ? (t / peak) : (1 - (t - peak) / (1 - peak));
  return min + (max - min) * dist;
}

export function computeTrackSizes(count, waveform, max, peak, totalUnits) {
  const weights = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    weights.push(getWaveWeight(t, waveform, max, peak));
  }
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => (w / totalWeight) * totalUnits);
}
