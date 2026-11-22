import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildAIExport,unwrapProject} from '../ai-export.js';
import {buildWiringText} from '../wiring-text.js';
const fixture=()=>({app:'wirenest',name:'handoff',boards:{},nodes:{a:{name:'J1.1 / OLD',netId:'n',gerber:{reference:'J1',pin:'1',net:'OLD'}},b:{name:'same',netId:'n'},c:{name:'same',netId:'m'}},nets:{n:{name:'NEW'},m:{name:'NEW'}},wires:{w:{a:'a',b:'c',netId:'n'}}});
test('handoff distinguishes assigned, source and actual connectivity with stable IDs',()=>{
  const p=fixture(),before=JSON.stringify(p),r=buildAIExport(p);
  assert.equal(r.summary.connectionPoints[0].assignedNetName,'NEW');
  assert.equal(r.summary.connectionPoints[0].pcbPad.net,'OLD');
  assert.equal(r.summary.connections[0].from.reference,'J1');
  assert.deepEqual(r.summary.nets[0].assignedNodeIds,['a','b']);
  assert.deepEqual(r.summary.unconnectedNodeIds,['b']);
  assert.equal(r.summary.connections.length,1);
  assert.ok(r.summary.warnings.some(w=>w.includes('differs from node c')));
  assert.deepEqual(unwrapProject(JSON.parse(JSON.stringify(r))),p);assert.equal(JSON.stringify(p),before);
  const text=buildWiringText(p);
  assert.match(text,/현재네트="NEW" 거버원본네트="OLD"/);
  assert.match(text,/지정패드ID=\["a","b"\]/);
  assert.match(text,/패드ID="a" ↔ 패드ID="c"/);
});
test('unassigned and dangling net references are explicit without inventing connections',()=>{
  const p=fixture();delete p.nodes.a.netId;p.nodes.b.netId='missing';p.wires={};
  const r=buildAIExport(p);assert.equal(r.summary.connectionPoints[0].assignedNetId,null);
  assert.equal(r.summary.connectionPoints[1].assignedNetId,'missing');assert.equal(r.summary.connectionPoints[1].assignedNetName,null);
  assert.ok(r.summary.warnings.some(w=>w.includes('missing assigned net')));
  assert.equal(r.summary.connections.length,0);
});
