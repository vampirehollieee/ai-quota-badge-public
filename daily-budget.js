const valid=n=>typeof n==='number'&&Number.isFinite(n);
const day=t=>{const d=new Date(t);return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
export function updateDailyBudget(saved={},state={},snapshots=[]) {
 const next={...saved};
 for(const provider of ['claude','codex']){
  const data=state[provider],row=data?.rows?.find(r=>r.label==='每週');
  if(data?.status!=='ok'||!valid(data.updatedAt)||data.updatedAt!==state.lastAttempt||!valid(row?.used)||!valid(row.resetAt))continue;
  const previous=next[provider],time=data.updatedAt,today=day(time);
  if(previous?.last?.time>time)continue;
  const yesterdayDate=new Date(time);yesterdayDate.setDate(yesterdayDate.getDate()-1);
  const yesterday=day(yesterdayDate.getTime());
  const current={time,used:row.used,resetAt:row.resetAt};
  const readings=snapshots.filter(s=>s.provider===provider&&s.kind==='每週');
  if(valid(previous?.observedAt))readings.push({time:previous.observedAt,used:100-previous.remaining,resetAt:previous.resetAt});
  if(previous?.last)readings.push(previous.last);
  readings.push(current);
  const ordered=readings.filter(s=>valid(s.time)&&s.time<=time&&valid(s.used)&&valid(s.resetAt)&&(day(s.time)===today||day(s.time)===yesterday)).sort((a,b)=>a.time-b.time);
  let baseline=ordered.filter(s=>day(s.time)===yesterday).at(-1)??ordered.find(s=>day(s.time)===today);
  let last=baseline;
  for(const sample of ordered.filter(s=>s.time>baseline.time)){
   // A scheduled boundary, moved reset time, or observed large drop starts a new cycle.
   if((last.time<last.resetAt&&sample.time>=last.resetAt)||sample.resetAt-last.resetAt>3600000||last.used-sample.used>=20)baseline=sample;
   last=sample;
  }
  next[provider]={day:today,remaining:100-baseline.used,resetAt:baseline.resetAt,observedAt:baseline.time,last:current};
 }
 return next;
}
export function budgetView(baseline,row,provider,now=Date.now()){
 if(!valid(baseline?.remaining)||!valid(row?.used)||!valid(row.resetAt)||row.resetAt<=now)return null;
 const remaining=100-row.used,days=(row.resetAt-now)/86400000;
 const available=Math.max(0,Math.min(100,Math.round((remaining-(provider==='claude'?10:15))/days)));
 const used=Math.max(0,Math.round((baseline.remaining-remaining)*100)/100);
 return {available,used,tick:Math.max(0,Math.min(100,baseline.remaining-available)),over:used>available};
}
