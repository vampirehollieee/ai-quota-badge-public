import {updateDailyBudget} from './daily-budget.js';
const HOUR=3600000;
const number=value=>typeof value==='number'&&Number.isFinite(value);
export function updateResetLog(log={},state={},now=Date.now()) {
  const snapshots=(log?.snapshots??[]).filter(s=>number(s.time)&&s.time>=now-48*HOUR);
  const events=[...(log?.events??[])];
  for(const provider of ['claude','codex']) {
    const data=state[provider];
    // The updater also saves before fetching. Only consume this attempt's successful result.
    if(data?.status!=='ok'||!number(data.updatedAt)||data.updatedAt!==state.lastAttempt)continue;
    for(const row of data.rows??[]) {
      const previous=snapshots.filter(s=>s.provider===provider&&s.kind===row.label).sort((a,b)=>b.time-a.time)[0];
      if(previous&&previous.time>=data.updatedAt)continue;
      const current={time:data.updatedAt,provider,kind:row.label,used:number(row.used)?row.used:null,resetAt:number(row.resetAt)?row.resetAt:null};
      if(previous) {
        const resetMoved=number(previous.resetAt)&&number(current.resetAt)&&current.resetAt-previous.resetAt>HOUR;
        const usageDropped=number(previous.used)&&number(current.used)&&previous.used-current.used>=20;
        if(resetMoved||usageDropped)events.push({provider,kind:row.label,
          remaining:number(previous.used)?Number((100-previous.used).toFixed(2)):null,
          observedAt:previous.time,detectedAt:now,scheduledAt:previous.resetAt,
          early:number(previous.resetAt)&&now<previous.resetAt});
      }
      snapshots.push(current);
    }
  }
  return {snapshots,events:events.sort((a,b)=>b.detectedAt-a.detectedAt).slice(0,30)};
}
export function createLoggedSave(storage,now=Date.now) {
  return async state=>{
    const {resetLog}=await storage.get('resetLog');
    const {dailyBudget}=await storage.get('dailyBudget');
    await storage.set({quotaState:state,resetLog:updateResetLog(resetLog,state,now()),dailyBudget:updateDailyBudget(dailyBudget,state,resetLog?.snapshots)});
  };
}
