const secretKey = /email|uuid|name|token|password|secret|authorization|cookie|(^|[_-])ids?$|Id$|ID$/;
export function redact(value, key = '') {
  if (secretKey.test(key) || /email|uuid|name|token|password|secret|authorization|cookie/i.test(key)) return '***';
  if (Array.isArray(value)) return value.map(item => redact(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, redact(v,k)]));
  if (typeof value === 'string') {
    const timestamp = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
    if (/@/.test(value) || (value.length > 20 && !timestamp)) return '***';
  }
  return value;
}

export async function collect(emit, fetcher = fetch) {
  async function request(label, url, headers = {}) {
    const shownUrl = url.replace(/\/organizations\/[^/]+\/usage$/, '/organizations/***/usage');
    try {
      const response = await fetcher(url, {method:'GET', credentials:'include', headers, cache:'no-store', redirect:'error', signal:AbortSignal.timeout(20000)});
      let data;
      try { data = await response.json(); }
      catch { emit({label, url:shownUrl, status:response.status, json:null, message:'回應不是 JSON；未顯示原文。停止此來源。'}); return null; }
      emit({label, url:shownUrl, status:response.status, json:redact(data), message:response.ok ? '' : ([401,403].includes(response.status) ? '沒登入或存取遭拒，請先打開對應網站。' : '請求失敗；停止此來源，不自動重試。')});
      return response.ok ? data : null;
    } catch {
      emit({label, url:shownUrl, status:null, json:null, message:'無 HTTP 狀態：網路錯誤、逾時或重新導向遭拒。不自動重試。'});
      return null;
    }
  }
  const orgs = await request('Claude · organizations', 'https://claude.ai/api/organizations');
  if (orgs) {
    if (Array.isArray(orgs) && typeof orgs[0]?.uuid === 'string' && orgs[0].uuid) {
      await request('Claude · usage', `https://claude.ai/api/organizations/${encodeURIComponent(orgs[0].uuid)}/usage`);
    } else emit({label:'Claude · usage',url:'https://claude.ai/api/organizations/{uuid}/usage',status:null,json:null,message:'結構不符：找不到第一個 organization 的 uuid；未送出 usage 請求。'});
  }
  let session = await request('Codex · session', 'https://chatgpt.com/api/auth/session');
  if (session) {
    // Candidate path only: step 0 must verify this against the user's real session.
    let token = session.accessToken;
    const accountId = session.account?.id;
    session = null;
    if (typeof token === 'string' && token && typeof accountId === 'string' && accountId) {
      try { await request('Codex · usage', 'https://chatgpt.com/backend-api/wham/usage', {'Authorization':`Bearer ${token}`, 'ChatGPT-Account-Id':accountId}); }
      finally { token = null; }
    } else {
      token = null;
      emit({label:'Codex · usage',url:'https://chatgpt.com/backend-api/wham/usage',status:null,json:null,message:'結構不符：找不到 accessToken 或 account.id；未送出 usage 請求。請提供上方遮蔽後的 session 結構。'});
    }
  }
}
