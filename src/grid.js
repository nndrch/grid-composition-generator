export function getWaveWeight(t, type, min, max, peak) {
  if (type === 'locked') return max;
  let dist = 0;
  if (type === 'sawtooth') {
    if (peak === 0)      dist = 1 - t;
    else if (peak === 1) dist = t;
    else dist = t < peak ? (t / peak) : (1 - (t - peak) / (1 - peak));
  } else if (type === 'sine') {
    const angle = t < peak
      ? (t / peak) * (Math.PI / 2)
      : (Math.PI / 2) + ((t - peak) / (1 - peak)) * (Math.PI / 2);
    dist = Math.sin(angle);
  }
  return min + (max - min) * dist;
}

export function computeTrackSizes(count, waveform, min, max, peak, totalUnits) {
  const weights = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    weights.push(getWaveWeight(t, waveform, min, max, peak));
  }
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  return weights.map(w => (w / totalWeight) * totalUnits);
}
