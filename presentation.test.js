import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pixelCount} from './presentation.js';
test('20-cell meter rounds up with a visible cell for every positive remainder',()=>{
  for(const [remaining,expected] of [[0,0],[0.01,1],[1,1],[5,1],[5.1,2],[10,2],[30,6],[71,15],[100,20],[null,0]]) assert.equal(pixelCount(remaining),expected);
});
