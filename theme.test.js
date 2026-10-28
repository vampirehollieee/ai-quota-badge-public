import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createThemeController} from './theme.js';
test('default follows system changes without writing a preference',async()=>{
  const applied=[],writes=[];let dark=false;
  const c=createThemeController({read:async()=>undefined,write:async v=>writes.push(v),systemDark:()=>dark,apply:v=>applied.push(v)});
  await c.init();dark=true;c.systemChanged();
  assert.deepEqual(applied,['light','dark']);assert.deepEqual(writes,[]);
});
test('click persists opposite theme and saved choice wins after reopening and system changes',async()=>{
  let saved, dark=true;const applied=[];
  const options={read:async()=>saved,write:async v=>{saved=v;},systemDark:()=>dark,apply:v=>applied.push(v)};
  const c=createThemeController(options);await c.init();await c.toggle();
  assert.equal(saved,'light');c.systemChanged();assert.equal(applied.at(-1),'light');
  const reopened=createThemeController(options);await reopened.init();assert.equal(applied.at(-1),'light');
  await reopened.toggle();assert.equal(saved,'dark');dark=false;reopened.systemChanged();assert.equal(applied.at(-1),'dark');
});
test('invalid saved value follows system and failed write does not change selected theme',async()=>{
  const applied=[];const c=createThemeController({read:async()=>'invalid',write:async()=>{throw Error('storage');},systemDark:()=>false,apply:v=>applied.push(v)});
  await c.init();await assert.rejects(c.toggle());assert.deepEqual(applied,['light']);
});
