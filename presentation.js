export function pixelCount(remaining) {
  return typeof remaining==='number' && Number.isFinite(remaining) ? Math.ceil(Math.min(100,Math.max(0,remaining))/5) : 0;
}

export function visibleQuotaRows(provider, data) {
  const labels = provider === 'claude' ? ['5 小時', '每週'] : ['每週'];
  const rows = data?.status === 'ok' ? data.rows : [];
  return labels.map(label => rows.find(row => row.label === label) ?? {label, used: null, resetAt: null});
}
