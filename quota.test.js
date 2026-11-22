import './locale-fixture.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeClaude, normalizeCodex, badge, countdown, resetLabel} from './quota.js';

test('Claude reads synthetic utilization and does not mistake product shares for limits', () => {
  const rows = normalizeClaude({five_hour:{utilization:24,resets_at:'2030-01-01T12:00:00.000000+00:00'},seven_day:{utilization:62},seven_day_opus:null,seven_day_sonnet:{utilization:41},seven_day_breakdown:{rows:[{percent:87}]}});
  assert.deepEqual(rows.map(r=>[r.label,r.used]),[['5 小時',24],['每週',62],['每週 · Sonnet',41]]);
  assert.equal(rows[0].resetAt,Date.parse('2030-01-01T12:00:00.000Z'));
  assert.equal(rows[1].resetAt,null);
});
test('Codex primary weekly window is not labeled five hours', () => {
  const rows=normalizeCodex({rate_limit:{primary_window:{used_percent:30,limit_window_seconds:604800,reset_at:1893456000},secondary_window:null}});
  assert.deepEqual(rows,[{label:'每週',used:30,resetAt:1893456000000}]);
});
test('missing and invalid fields remain unknown; secondary five-hour window is supported', () => {
  assert.equal(normalizeClaude({})[0].used,null);
  const rows=normalizeCodex({rate_limit:{primary_window:{used_percent:'30',limit_window_seconds:604800},secondary_window:{used_percent:12,limit_window_seconds:18000,reset_after_seconds:60}}},1000);
  assert.deepEqual(rows,[{label:'5 小時',used:12,resetAt:61000},{label:'每週',used:null,resetAt:null}]);
});
test('badge shows minimum remaining quota with inclusive yellow boundaries', () => {
  const state=used=>({claude:{status:'ok',rows:[{used}]},codex:{status:'error',rows:[{used:100}]}});
  assert.equal(badge(state(69)).color,'#6e6e68');
  assert.equal(badge(state(70)).color,'#a85400');
  assert.equal(badge(state(90)).color,'#a85400');
  assert.equal(badge(state(91)).color,'#b42318');
  assert.equal(badge(state(99)).text,'1%');
  assert.equal(badge({claude:{status:'ok',rows:[{used:29},{used:99}]},codex:{status:'ok',rows:[{used:30}]}}).text,'1%');
  assert.equal(badge({}).text,'—');
});
test('countdown handles unknown, expired and future reset without fabricating fresh quota', () => {
  assert.equal(countdown(null,0),'重置時間 —');
  assert.equal(countdown(1000,2000),'已到重置時間，待更新');
  assert.equal(countdown(90061000,0),'1 天 1 小時 1 分後重置');
});
test('weekly labels use local weekday and time while five hours keeps countdown',()=>{
  const expected=iso=>{const p=new Intl.DateTimeFormat('zh-TW',{weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(Date.parse(iso));const part=k=>p.find(v=>v.type===k).value;return `${part('weekday').replace('星期','週')} ${part('hour')}:${part('minute')} 重置`;};
  assert.equal(resetLabel({label:'每週',resetAt:Date.parse('2026-10-23T15:00:00Z')}),expected('2026-10-23T15:00:00Z'));
  assert.equal(resetLabel({label:'每週 · Sonnet',resetAt:Date.parse('2026-10-23T16:00:00Z')}),expected('2026-10-23T16:00:00Z'));
  assert.equal(resetLabel({label:'每週',resetAt:null}),'重置時間 —');
  assert.equal(resetLabel({label:'5 小時',resetAt:7260000},0),'2 小時 1 分後重置');
});
