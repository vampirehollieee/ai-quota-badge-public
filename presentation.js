export function pixelCount(remaining) {
  return typeof remaining==='number' && Number.isFinite(remaining) ? Math.ceil(Math.min(100,Math.max(0,remaining))/5) : 0;
}
