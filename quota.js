const percent = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
const iso = s => typeof s === 'string' && Number.isFinite(Date.parse(s)) ? Date.parse(s) : null;
export function normalizeClaude(data) {
  const row = (label, v) => ({label, used:percent(v?.utilization), resetAt:iso(v?.resets_at)});
  const rows = [row('5 小時',data?.five_hour),row('每週',data?.seven_day)];
  const names = {seven_day_opus:'Opus',seven_day_sonnet:'Sonnet',seven_day_cowork:'Cowork',seven_day_oauth_apps:'OAuth 應用程式'};
  for (const [key,value] of Object.entries(data ?? {})) {
    if (key.startsWith('seven_day_') && key !== 'seven_day_breakdown' && value && typeof value === 'object' && !Array.isArray(value) && ('utilization' in value || 'resets_at' in value)) rows.push(row(`每週 · ${names[key] ?? key.slice(10)}`,value));
  }
  return rows;
}
export function normalizeCodex(data, now = Date.now()) {
  const windows = [data?.rate_limit?.primary_window,data?.rate_limit?.secondary_window].filter(v=>v && typeof v === 'object');
  const rows = windows.map(v=>{
    const label = v.limit_window_seconds === 18000 ? '5 小時' : v.limit_window_seconds === 604800 ? '每週' : '週期 —';
    const resetAt = typeof v.reset_at === 'number' && Number.isFinite(v.reset_at) ? v.reset_at * 1000 : typeof v.reset_after_seconds === 'number' && Number.isFinite(v.reset_after_seconds) && v.reset_after_seconds >= 0 ? now + v.reset_after_seconds * 1000 : null;
    return {label,used:percent(v.used_percent),resetAt};
  });
  if (!rows.length) rows.push({label:'每週',used:null,resetAt:null});
  return rows.sort((a,b)=>(a.label==='5 小時'?0:1)-(b.label==='5 小時'?0:1));
}
export function badge(state) {
  const values = ['claude','codex'].flatMap(k=>state[k]?.status==='ok' ? state[k].rows.map(r=>r.used).filter(n=>percent(n)!==null) : []);
  if (!values.length) return {text:'—',color:'#6e6e68'};
  const remaining = 100-Math.max(...values);
  return {text:`${Math.round(remaining)}%`,color:remaining<10?'#b42318':remaining<=30?'#a85400':'#6e6e68'};
}
export function countdown(resetAt,now=Date.now()) {
  if (typeof resetAt !== 'number' || !Number.isFinite(resetAt)) return '重置時間 —';
  if (resetAt<=now) return '已到重置時間，待更新';
  const minutes=Math.floor((resetAt-now)/60000);
  if (!minutes) return '不到 1 分後重置';
  const days=Math.floor(minutes/1440), hours=Math.floor(minutes%1440/60), mins=minutes%60;
  return `${days?`${days} 天 `:''}${hours?`${hours} 小時 `:''}${mins} 分後重置`;
}
export function resetLabel(row,now=Date.now()) {
  if (!row.label.startsWith('每週')) return countdown(row.resetAt,now);
  if (typeof row.resetAt!=='number' || !Number.isFinite(row.resetAt)) return '重置時間 —';
  const parts=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(row.resetAt);
  const part=type=>parts.find(p=>p.type===type).value;
  return `${part('weekday').replace('星期','週')} ${part('hour')}:${part('minute')} 重置`;
}
