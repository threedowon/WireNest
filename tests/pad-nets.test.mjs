import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignPadNet} from '../pad-nets.js';
test('bulk assignment updates selected pads and attached wires while preserving source CAD nets and IDs',()=>{
  const pads=[{id:'a',gerber:{net:'CAD_A'}},{id:'b',netId:'old'},{id:'c',netId:'old'}];
  const wires=[{id:'w1',a:'a',b:'c',netId:'old'},{id:'w2',a:'x',b:'y',netId:'old'}];
  assignPadNet(pads.slice(0,2),wires,'new');
  assert.deepEqual(pads.map(p=>p.netId),['new','new','old']);
  assert.equal(pads[0].gerber.net,'CAD_A');assert.equal(wires[0].netId,'new');assert.equal(wires[1].netId,'old');
  const saved=JSON.parse(JSON.stringify({pads,wires}));assert.equal(saved.pads[1].netId,'new');
  assignPadNet(pads.slice(0,2),wires,null);assert.equal(pads[0].netId,null);assert.equal(wires[0].netId,null);
});
