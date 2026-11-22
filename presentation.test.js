import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pixelCount} from './presentation.js';
test('20-cell meter rounds up with a visible cell for every positive remainder',()=>{
  for(const [remaining,expected] of [[0,0],[0.01,1],[1,1],[5,1],[5.1,2],[10,2],[30,6],[71,15],[100,20],[null,0]]) assert.equal(pixelCount(remaining),expected);
});

import {visibleQuotaRows} from './presentation.js';
test('Claude shows five-hour then weekly quota, including zero utilization',()=>{
 const weekly={label:'每週',used:25,resetAt:42},short={label:'5 小時',used:0,resetAt:9};
 const data={status:'ok',rows:[weekly,short]};
 assert.deepEqual(visibleQuotaRows('claude',data),[short,weekly]);
 assert.deepEqual(visibleQuotaRows('codex',data),[weekly]);
});
test('a missing five-hour window stays unknown without borrowing the weekly value',()=>{
 const weekly={label:'每週',used:70,resetAt:15};
 assert.deepEqual(visibleQuotaRows('claude',{status:'ok',rows:[weekly]}),[{label:'5 小時',used:null,resetAt:null},weekly]);
});
