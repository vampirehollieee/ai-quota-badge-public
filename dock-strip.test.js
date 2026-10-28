import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compactReset,stripCellFill,stripLayout} from './dock-strip-format.js';
test('ten cells preserve proportional fill without rounding up',()=>{
 const fills=n=>Array.from({length:10},(_,i)=>stripCellFill(n,i));
 assert.deepEqual(fills(44),[100,100,100,100,40,0,0,0,0,0]);
 assert.deepEqual(fills(90),[100,100,100,100,100,100,100,100,100,0]);
 assert.deepEqual(fills(5),[50,0,0,0,0,0,0,0,0,0]);
 assert.deepEqual(fills(100),Array(10).fill(100));
 for(const n of [null,NaN,Infinity,-1,0])assert.deepEqual(fills(n),Array(10).fill(0));
 assert.deepEqual(fills(110),Array(10).fill(100));
 assert.equal(stripCellFill(44.25,4),42.5);
});
test('compact reset retains countdown and Taipei weekday already rendered by shared UI',()=>{
 assert.equal(compactReset('2 小時 49 分後重置'),'2:49 後');
 assert.equal(compactReset('9 分後重置'),'0:09 後');
 assert.equal(compactReset('1 天 2 小時 3 分後重置'),'26:03 後');
 assert.equal(compactReset('週六 00:00 重置'),'週六 00:00');
 assert.equal(compactReset('不到 1 分後重置'),'<1 分後');
 assert.equal(compactReset('重置時間 —'),'—');
});
test('font shrinks before two-row layout while preserving 11px minimum',()=>{
 assert.deepEqual(stripLayout(1100,3,250),{columns:3,font:13});
 assert.deepEqual(stripLayout(780,3,250),{columns:3,font:11.44});
 assert.deepEqual(stripLayout(530,3,250),{columns:2,font:11.66});
});
