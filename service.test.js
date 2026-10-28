import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUpdater,fetchProvider} from './service.js';
const ok=data=>new Response(JSON.stringify(data));
test('stored state never contains session, identifiers or credentials; cooldown survives worker recreation',async()=>{
  let saved={},time=100000,calls=0;
  const options={load:async()=>structuredClone(saved),save:async s=>{saved=structuredClone(s);},now:()=>time,fetcher:async(url,init)=>{
    calls++;
    if(url.endsWith('/organizations'))return ok([{uuid:'private-org'}]);
    if(url.includes('claude.ai'))return ok({five_hour:{utilization:24},seven_day:{utilization:62}});
    if(url.endsWith('/session'))return ok({accessToken:'private-token',account:{id:'private-account'},email:'private@example.test'});
    assert.equal(init.headers.Authorization,'Bearer private-token');
    assert.equal(init.headers['ChatGPT-Account-Id'],'private-account');
    return ok({rate_limit:{primary_window:{used_percent:36,limit_window_seconds:604800}}});
  }};
  const update=createUpdater(options);
  await Promise.all([update(),update()]);
  assert.equal(calls,4);
  assert.equal(/private|accessToken|account|email/.test(JSON.stringify(saved)),false);
  time+=59999;await createUpdater(options)();assert.equal(calls,4);
  time++;await createUpdater(options)();assert.equal(calls,8);
});
test('identical failure retries only once across worker recreation while healthy provider continues',async()=>{
  let saved={},time=100000,claudeCalls=0,codexCalls=0;
  const options={load:async()=>structuredClone(saved),save:async s=>{saved=structuredClone(s);},now:()=>time,fetcher:async url=>{
    if(url.includes('claude.ai')){claudeCalls++;return new Response('{}',{status:500});}
    codexCalls++;
    if(url.endsWith('/session'))return ok({accessToken:'secret',account:{id:'account'}});
    return ok({rate_limit:{primary_window:{used_percent:36,limit_window_seconds:604800}}});
  }};
  for(let i=0;i<3;i++){await createUpdater(options)();time+=300000;}
  assert.equal(claudeCalls,2);assert.equal(codexCalls,6);
  assert.equal(saved.claude.paused,true);assert.equal(saved.codex.status,'ok');
});
test('401 stops a provider immediately and non-JSON 403 still reports authorization status',async()=>{
  const result=await fetchProvider('claude',async()=>new Response('<html>login</html>',{status:403}));
  assert.equal(result.error,'http-403');
  let saved={},time=100000,calls=0;
  const update=createUpdater({load:async()=>saved,save:async s=>{saved=s;},now:()=>time,fetcher:async()=>{calls++;return new Response('{}',{status:401});}});
  await update();time+=300000;await update();assert.equal(calls,2);
  assert.equal(saved.claude.paused,true);assert.equal(saved.codex.paused,true);
  time+=60000;await update(true);assert.equal(calls,4);
  time+=60000;await update(true);assert.equal(calls,4);
});
