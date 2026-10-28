import {t} from './i18n.js';
import {normalizeClaude,normalizeCodex} from './quota.js';
class RequestError extends Error { constructor(code) {super(code);this.code=code;} }
async function json(url,fetcher,headers={}) {
  let response;
  try { response=await fetcher(url,{method:'GET',credentials:'include',headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)}); }
  catch {throw new RequestError('network');}
  if (!response.ok) throw new RequestError(`http-${response.status}`);
  try { return await response.json(); } catch {throw new RequestError('json');}
}
export const fetchOrganizations=(fetcher=fetch)=>json('https://claude.ai/api/organizations',fetcher);
export async function fetchProvider(provider,fetcher=fetch,now=Date.now(),selectOrganization=async orgs=>orgs[0].uuid) {
  try {
    let rows;
    if (provider==='claude') {
      const orgs=await fetchOrganizations(fetcher);
      if (!Array.isArray(orgs) || typeof orgs[0]?.uuid!=='string' || !orgs[0].uuid) throw new RequestError('structure');
      const id=await selectOrganization(orgs);
      if(!orgs.some(o=>o.uuid===id))throw new RequestError('structure');
      rows=normalizeClaude(await json(`https://claude.ai/api/organizations/${encodeURIComponent(id)}/usage`,fetcher));
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
  if (error==='http-401'||error==='http-403') return t('loginError',provider==='claude'?'claude.ai':'chatgpt.com');
  if (error==='structure'||error==='json') return t('structureError');
  if (error?.startsWith('http-')) return t('httpError',error.slice(5));
  return t('networkError');
}
export function createUpdater({load,save,fetcher=fetch,now=Date.now,onBadge=async()=>{},selectOrganization}) {
  let active=null;
  async function run(manual,forceClaude) {
    const state=await load() ?? {};
    const time=now();
    if (!forceClaude && state.lastAttempt && time-state.lastAttempt<60000) return state;
    state.lastAttempt=time;
    await save(state);
    await Promise.all(['claude','codex'].map(async provider=>{
      if(forceClaude && provider!=='claude')return;
      const previous=state[provider];
      const loginRetry=manual && previous?.failures===1 && ['http-401','http-403'].includes(previous?.error);
      if (previous?.paused && !loginRetry && !forceClaude) return;
      const next=await fetchProvider(provider,fetcher,time,selectOrganization);
      if (next.status==='error') {
        // Organization resolution may have cleared the previous Claude state.
        const failureBaseline=(await load())?.[provider];
        next.failures=failureBaseline?.error===next.error ? (failureBaseline.failures??0)+1 : 1;
        next.paused=['http-401','http-403'].includes(next.error) || next.failures>=2;
      }
      state[provider]=next;
    }));
    if (['claude','codex'].some(k=>state[k]?.status==='ok' && state[k].updatedAt===time)) state.lastUpdate=now();
    await save(state);
    await onBadge(state);
    return state;
  }
  const refresh=(manual=false,forceClaude=false) => {
    if (!active) active=run(manual,forceClaude).finally(()=>{active=null;});
    return active;
  };

  return refresh;
}
