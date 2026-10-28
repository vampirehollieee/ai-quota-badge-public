import {normalizeClaude,normalizeCodex} from './quota.js';
class RequestError extends Error { constructor(code) {super(code);this.code=code;} }
async function json(url,fetcher,headers={}) {
  let response;
  try { response=await fetcher(url,{method:'GET',credentials:'include',headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)}); }
  catch {throw new RequestError('network');}
  if (!response.ok) throw new RequestError(`http-${response.status}`);
  try { return await response.json(); } catch {throw new RequestError('json');}
}
export async function fetchProvider(provider,fetcher=fetch,now=Date.now()) {
  try {
    let rows;
    if (provider==='claude') {
      const orgs=await json('https://claude.ai/api/organizations',fetcher);
      if (!Array.isArray(orgs) || typeof orgs[0]?.uuid!=='string' || !orgs[0].uuid) throw new RequestError('structure');
      rows=normalizeClaude(await json(`https://claude.ai/api/organizations/${encodeURIComponent(orgs[0].uuid)}/usage`,fetcher));
    } else {
      let session=await json('https://chatgpt.com/api/auth/session',fetcher);
      let token=session?.accessToken;
      const accountId=session?.account?.id;
      session=null;
      if (typeof token!=='string' || !token || typeof accountId!=='string' || !accountId) throw new RequestError('structure');
      try {rows=normalizeCodex(await json('https://chatgpt.com/backend-api/wham/usage',fetcher,{Authorization:`Bearer ${token}`,'ChatGPT-Account-Id':accountId}),now);}
      finally {token=null;}
    }
    if (!rows.some(r=>r.used!==null)) throw new RequestError('structure');
    return {status:'ok',rows,updatedAt:now,error:null,failures:0,paused:false};
  } catch (error) {
    return {status:'error',rows:[],updatedAt:null,error:error instanceof RequestError?error.code:'structure'};
  }
}
export function errorMessage(provider,error) {
  if (error==='http-401'||error==='http-403') return `沒登入，請先打開 ${provider==='claude'?'claude.ai':'chatgpt.com'}`;
  if (error==='structure'||error==='json') return '— 無法辨識額度欄位';
  if (error?.startsWith('http-')) return `讀取失敗（HTTP ${error.slice(5)}）`;
  return '連線失敗或逾時';
}
export function createUpdater({load,save,fetcher=fetch,now=Date.now,onBadge=async()=>{}}) {
  let active=null;
  async function run(manual) {
    const state=await load() ?? {};
    const time=now();
    if (state.lastAttempt && time-state.lastAttempt<60000) return state;
    state.lastAttempt=time;
    await save(state);
    await Promise.all(['claude','codex'].map(async provider=>{
      const previous=state[provider];
      const loginRetry=manual && previous?.failures===1 && ['http-401','http-403'].includes(previous?.error);
      if (previous?.paused && !loginRetry) return;
      const next=await fetchProvider(provider,fetcher,time);
      if (next.status==='error') {
        next.failures=previous?.error===next.error ? (previous.failures??0)+1 : 1;
        next.paused=['http-401','http-403'].includes(next.error) || next.failures>=2;
      }
      state[provider]=next;
    }));
    if (['claude','codex'].some(k=>state[k]?.status==='ok' && state[k].updatedAt===time)) state.lastUpdate=now();
    await save(state);
    await onBadge(state);
    return state;
  }
  return (manual=false) => {
    if (!active) active=run(manual).finally(()=>{active=null;});
    return active;
  };
}
