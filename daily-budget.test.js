import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateDailyBudget,budgetView} from './daily-budget.js';
const T=new Date(2026,9,25,1).getTime(),DAY=86400000;
const state=(t,used,reset=T+5*DAY)=>({lastAttempt:t,codex:{status:'ok',updatedAt:t,rows:[{label:'每週',used,resetAt:reset}]}});
const snapshot=(time,used,resetAt=T+5*DAY)=>({time,used,resetAt,provider:'codex',kind:'每週'});
test('uses yesterday latest success and keeps baseline through same day',()=>{
 const history=[snapshot(T-2*3600000,20),snapshot(T-90*60000,30)];
 let b=updateDailyBudget({},state(T,40),history);
 assert.equal(b.codex.remaining,70);
 b=updateDailyBudget(b,state(T+300000,45),history);
 assert.equal(budgetView(b.codex,{used:45,resetAt:T+5*DAY},'codex',T).used,15);
});
test('without yesterday falls back to first today, never two days ago',()=>{
 let b=updateDailyBudget({},state(T,30),[snapshot(T-2*DAY,10)]);
 b=updateDailyBudget(b,state(T+300000,40));assert.equal(b.codex.remaining,70);
 assert.equal(updateDailyBudget(b,state(T+DAY,45)).codex.remaining,60);
});
test('migration uses history first today and reset starts at first post-reset sample',()=>{
 const reset=T+3600000;
 const history=[snapshot(T-2*3600000,80,reset),snapshot(T,90,reset),snapshot(reset+1000,2,T+7*DAY)];
 let b=updateDailyBudget({},state(reset+300000,8,T+7*DAY),history);
 assert.equal(b.codex.remaining,98);
 assert.equal(budgetView(b.codex,{used:8,resetAt:T+7*DAY},'codex',reset+300000).used,6);
 b=updateDailyBudget({},state(T+300000,45),[snapshot(T,30)]);assert.equal(b.codex.remaining,70);
});
test('early reset and crossing scheduled reset with small usage drop reset baseline',()=>{
 let b=updateDailyBudget({},state(T,80,T+1000));
 b=updateDailyBudget(b,state(T+2000,75,T+1000));assert.equal(b.codex.remaining,25);
 b=updateDailyBudget(b,state(T+3000,0,T+7*DAY));assert.equal(b.codex.remaining,100);
});
test('errors, prefetch saves and older reads do not change baseline',()=>{
 const b=updateDailyBudget({},state(T,30));
 assert.deepEqual(updateDailyBudget(b,{...state(T,60),lastAttempt:T+DAY}),b);
 assert.deepEqual(updateDailyBudget(b,{lastAttempt:T,codex:{status:'error'}}),b);
 assert.deepEqual(updateDailyBudget(b,state(T-1000,20)),b);
});
test('unknown and expired reset do not produce a budget',()=>{
 assert.equal(budgetView(null,{used:30,resetAt:T+DAY},'codex',T),null);
 assert.equal(budgetView({remaining:70},{used:30,resetAt:T},'codex',T),null);
 assert.equal(budgetView({remaining:10},{used:95,resetAt:T+DAY},'codex',T).available,0);
});
