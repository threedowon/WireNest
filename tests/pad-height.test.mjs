import {test} from 'node:test';
import assert from 'node:assert/strict';
import {offsetPadHeight} from '../pad-height.js';
test('imported pads on different boards rise by the same mm delta without changing endpoints',()=>{
  const pads=[{id:'a',face:'top',modelHeight:.2},{id:'b',face:'top',modelHeight:.4}];
  [10,5].forEach((t,i)=>offsetPadHeight(pads[i],t,3));
  const saved=JSON.parse(JSON.stringify(pads));
  assert.equal(saved[0].modelHeight*10,5);assert.equal(saved[1].modelHeight*5,5);
  assert.deepEqual(saved.map(p=>p.id),['a','b']);
});
test('surface pads start from their own face and support lowering and horizontal-only moves',()=>{
  const top={face:'top'},bottom={face:'bottom'};
  offsetPadHeight(top,2,0);assert.equal(top.modelHeight,undefined);
  offsetPadHeight(top,2,1);assert.equal(top.modelHeight,1.5);
  offsetPadHeight(bottom,2,-1);assert.equal(bottom.modelHeight,-.5);
});
