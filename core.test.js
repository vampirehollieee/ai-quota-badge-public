import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redact, collect} from './core.js';

test('redacts nested identifiers, credentials and long strings but retains quota and timestamps', () => {
  assert.deepEqual(redact({email:'person@example.invalid', uuid:'abc', id:12, displayName:'Joe', accessToken:'secret', nested:[{account_id:'abc', note:'x'.repeat(21)}], used_percent:26, resets_at:'2026-10-20T02:10:00+08:00', reset_after_seconds:3600}), {
    email:'***', uuid:'***', id:'***', displayName:'***', accessToken:'***', nested:[{account_id:'***', note:'***'}], used_percent:26, resets_at:'2026-10-20T02:10:00+08:00', reset_after_seconds:3600
  });
});
test('collects sequentially and emits only redacted results; credentials go only to wham', async () => {
  const records = [], calls = [];
  const bodies = [[{uuid:'org-secret'}], {used_percent:26}, {accessToken:'token-secret',account:{id:'account-secret'}}, {used_percent:42}];
  await collect(r => records.push(r), async (url, options) => {
    calls.push({url, options}); return new Response(JSON.stringify(bodies[calls.length-1]), {status:200});
  });
  assert.deepEqual(calls.map(c => c.url), ['https://claude.ai/api/organizations','https://claude.ai/api/organizations/org-secret/usage','https://chatgpt.com/api/auth/session','https://chatgpt.com/backend-api/wham/usage']);
  assert.equal(calls[3].options.headers.Authorization, 'Bearer token-secret');
  assert.equal(calls[3].options.headers['ChatGPT-Account-Id'], 'account-secret');
  assert.ok(calls.slice(0,3).every(c => !c.options.headers.Authorization));
  assert.ok(calls.every(c => c.options.credentials === 'include' && c.options.redirect === 'error'));
  assert.equal(/org-secret|token-secret|account-secret/.test(JSON.stringify(records)), false);
  assert.equal(records[3].json.used_percent, 42);
});
test('Claude authorization failure does not block Codex; user id is never substituted for account id', async () => {
  const records = [], urls = [];
  await collect(r => records.push(r), async url => {
    urls.push(url);
    return url.includes('claude.ai') ? new Response('{}', {status:403}) : new Response(JSON.stringify({accessToken:'secret',user:{id:'wrong-id'}}));
  });
  assert.equal(urls.length,2);
  assert.equal(records[0].status,403);
  assert.match(records[2].message,/結構不符/);
  assert.equal(JSON.stringify(records).includes('wrong-id'),false);
});
test('non-JSON and network failures do not expose bodies or error strings and never retry', async () => {
  const records = []; let count = 0;
  await collect(r => records.push(r), async () => {
    count++;
    if (count === 1) return new Response('<html>secret</html>',{status:502});
    throw new Error('token-secret');
  });
  assert.equal(count,2);
  assert.equal(records[0].status,502);
  assert.equal(records[1].status,null);
  assert.equal(JSON.stringify(records).includes('secret'),false);
});
test('does not let time-like keys bypass secret and string filtering', () => {
  assert.deepEqual(redact({reset_token:'secret', reset_at:'x'.repeat(30), detail:'person@example.invalid', nullable:null, enabled:true}), {reset_token:'***',reset_at:'***',detail:'***',nullable:null,enabled:true});
});
