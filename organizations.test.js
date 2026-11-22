import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOrganizationController} from './organizations.js';
import {fetchProvider,createUpdater} from './service.js';
import {createLoggedSave} from './reset-log.js';
const orgs=[{uuid:'org-a',name:'Synthetic Personal'},{uuid:'org-b',name:'Synthetic Team'}];
function fixture(initial={}){const data=structuredClone(initial);return {data,storage:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(data[k])])),set:async v=>Object.assign(data,structuredClone(v))}};}
test('organization default, persisted selection and removed organization fallback',async()=>{
 const {data,storage}=fixture();const c=createOrganizationController(storage);
 assert.equal(await c.resolve(orgs),'org-a');assert.equal(c.view().organizations.length,2);
 await c.select('org-b');assert.equal(await c.resolve(orgs),'org-b');assert.equal(data.claudeOrganizationId,'org-b');
 const restarted=createOrganizationController(storage);assert.equal(await restarted.resolve(orgs),'org-b');
 assert.equal(await restarted.resolve([orgs[0]]),'org-a');assert.equal(restarted.view().organizations.length,1);
 await assert.rejects(()=>restarted.select('not-an-org'));
 assert(!JSON.stringify(data).includes('Synthetic'));
});
test('changing organization clears only Claude baselines and history',async()=>{
 const {data,storage}=fixture({claudeEffectiveOrganizationId:'org-a',claudeOrganizationId:'org-b',quotaState:{claude:{status:'ok'},codex:{status:'ok'}},dailyBudget:{claude:{remaining:80},codex:{remaining:70}},resetLog:{snapshots:[{provider:'claude'},{provider:'codex'}],events:[{provider:'claude'},{provider:'codex'}]}});
 await createOrganizationController(storage).resolve(orgs);
 assert.equal(data.dailyBudget.claude,undefined);assert.equal(data.dailyBudget.codex.remaining,70);
 assert.deepEqual(data.resetLog.snapshots,[{provider:'codex'}]);assert.deepEqual(data.resetLog.events,[{provider:'codex'}]);assert.equal(data.quotaState.claude,undefined);
});
test('provider requests selected organization without names in returned quota',async()=>{
 const calls=[];const result=await fetchProvider('claude',async url=>{calls.push(url);return new Response(JSON.stringify(url.endsWith('/organizations')?orgs:{seven_day:{utilization:24,resets_at:'2030-01-07T00:00:00Z'}}));},1000,async()=> 'org-b');
 assert(calls[1].endsWith('/org-b/usage'));assert.equal(result.status,'ok');assert(!JSON.stringify(result).includes('Synthetic'));
});

test('switching organizations resets failure retries and does not refresh Codex',async()=>{
 const now=Date.parse('2030-01-01T08:00:00Z');
 const {data,storage}=fixture({claudeOrganizationId:'org-a',claudeEffectiveOrganizationId:'org-a',quotaState:{lastAttempt:now,claude:{status:'error',rows:[],error:'http-401',failures:1,paused:true},codex:{status:'ok',updatedAt:now,rows:[]}}});
 const controller=createOrganizationController(storage);await controller.resolve(orgs);await controller.select('org-b');
 const calls=[];const refresh=createUpdater({load:async()=>structuredClone(data.quotaState),save:createLoggedSave(storage),now:()=>now,selectOrganization:raw=>controller.resolve(raw),fetcher:async url=>{calls.push(url);return url.endsWith('/organizations')?new Response(JSON.stringify(orgs)):new Response('',{status:401});}});
 await refresh(true,true);
 assert.equal(data.quotaState.claude.failures,1);
 assert.equal(data.quotaState.codex.updatedAt,now);
 assert(calls.every(url=>url.startsWith('https://claude.ai/')));
 assert(!JSON.stringify(data).includes('Synthetic'));
});
