import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateResetLog} from './reset-log.js';
const H=3600000,T=Date.parse('2026-10-19T14:58:00Z');
const state=(time,used,resetAt,provider='claude',label='每週')=>({lastAttempt:time,[provider]:{status:'ok',updatedAt:time,rows:[{label,used,resetAt}]}});
const seed=()=>updateResetLog({},state(T-60000,99,T+H),T-60000);
test('stores only fresh successful rows, deduplicates saves, isolates providers and quota kinds',()=>{
 let log=seed();assert.equal(log.snapshots.length,1);assert.equal(log.events.length,0);
 log=updateResetLog(log,state(T-60000,99,T+H),T);assert.equal(log.snapshots.length,1);
 log=updateResetLog(log,{...state(T-60000,0,T+H),lastAttempt:T},T);assert.equal(log.snapshots.length,1);
 log=updateResetLog(log,state(T,0,T+H,'codex'),T);assert.equal(log.events.length,0);
 log=updateResetLog(log,state(T,0,T+H,'claude','5 小時'),T);assert.equal(log.events.length,0);
 log=updateResetLog(log,{lastAttempt:T,claude:{status:'error',updatedAt:T,rows:[]}},T);assert.equal(log.snapshots.length,3);
});
test('reset shift must exceed one hour; usage drop of exactly 20 points qualifies',()=>{
 assert.equal(updateResetLog(seed(),state(T,99,T+2*H),T).events.length,0);
 assert.equal(updateResetLog(seed(),state(T,99,T+2*H+1),T).events.length,1);
 assert.equal(updateResetLog(seed(),state(T,80,T+H),T).events.length,0);
 const log=updateResetLog(seed(),state(T,79,T+H),T);
 assert.deepEqual(log.events[0],{provider:'claude',kind:'每週',remaining:1,observedAt:T-60000,detectedAt:T,scheduledAt:T+H,early:true});
 assert.equal(updateResetLog(log,state(T,79,T+H),T).events.length,1);
});
test('null fields never become zero; normal resets are not early',()=>{
 let log=updateResetLog({},state(T-60000,null,T),T-60000);
 log=updateResetLog(log,state(T,0,T+2*H),T);assert.equal(log.events[0].remaining,null);assert.equal(log.events[0].early,false);
 log=updateResetLog({},state(T-60000,50,null),T-60000);
 log=updateResetLog(log,state(T,null,T+H),T);assert.equal(log.events.length,0);
});
test('prunes snapshots older than 48 hours and keeps newest 30 events',()=>{
 const events=Array.from({length:35},(_,i)=>({detectedAt:T-i}));
 const log=updateResetLog({snapshots:[{provider:'claude',kind:'每週',time:T-48*H-1,used:99,resetAt:T}],events},state(T,0,T+H),T);
 assert.equal(log.snapshots.length,1);assert.equal(log.events.length,30);assert.equal(log.events[0].detectedAt,T);assert.equal(log.events.at(-1).detectedAt,T-29);
});

test('automatic/manual updater persists events across restarts without logging cooldown or failed sources',async()=>{
 const {createUpdater}=await import('./service.js');
 const {createLoggedSave}=await import('./reset-log.js');
 let saved={},now=T,used=99;
 const storage={get:async key=>({[key]:structuredClone(saved[key])}),set:async values=>{Object.assign(saved,structuredClone(values));}};
 const options={load:async()=>structuredClone(saved.quotaState),save:createLoggedSave(storage,()=>now),now:()=>now,fetcher:async url=>{
   if(url.includes('chatgpt.com'))return new Response('{}',{status:401});
   const json=url.endsWith('/organizations')?[{uuid:'private-org'}]:{seven_day:{utilization:used,resets_at:new Date(T+H).toISOString()}};
   return new Response(JSON.stringify(json));
 }};
 await createUpdater(options)();assert.equal(saved.resetLog.snapshots.length,2);
 now+=300000;used=1;await createUpdater(options)(true);
 assert.equal(saved.resetLog.snapshots.length,4);assert.equal(saved.resetLog.events.length,1);assert.equal(saved.resetLog.events[0].remaining,1);
 await createUpdater(options)(true);assert.equal(saved.resetLog.snapshots.length,4);
 assert.equal(JSON.stringify(saved.resetLog).includes('private-org'),false);
});
