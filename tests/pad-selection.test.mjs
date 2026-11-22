import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectPadRange} from '../pad-selection.js';
const pads=['p1','p2','p3','p4'].map(id=>({id}));
const ids=result=>result.map(p=>p.id);
test('shift selects an inclusive range in displayed order, in both directions',()=>{
  assert.deepEqual(ids(selectPadRange(pads,'p4',{board:'b',id:'p2'},'b')),['p2','p3','p4']);
  assert.deepEqual(ids(selectPadRange(pads,'p1',{board:'b',id:'p3'},'b')),['p1','p2','p3']);
  assert.deepEqual(ids(selectPadRange(pads,'p2',{board:'b',id:'p2'},'b')),['p2']);
});
test('missing or different-board anchors cannot select an unrelated range',()=>{
  assert.equal(selectPadRange(pads,'p3',null,'b'),null);
  assert.equal(selectPadRange(pads,'p3',{board:'other',id:'p1'},'b'),null);
  assert.equal(selectPadRange(pads,'p3',{board:'b',id:'deleted'},'b'),null);
});
