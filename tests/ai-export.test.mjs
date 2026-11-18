import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAIExport,nodePosition,unwrapProject,aiExportFilename} from '../ai-export.js';
const project=()=>({app:'wirenest',v:2,name:'배선 검토',boards:{b:{id:'b',name:'PCB',x:10,y:20,z:3,w:20,d:10,thick:4,rot:90,hidden:true}},nodes:{a:{id:'a',board:'b',u:0,v:0,face:'top',name:'VCC'},b:{id:'b',board:'b',u:20,v:10,face:'bottom',name:'GND'},j:{id:'j',board:null,wx:0,wy:0,wz:9,name:'J',wago:true},u:{id:'u',board:'b',u:10,v:5,modelHeight:.25}},wires:{w:{id:'w',a:'a',b:'j',netId:'n',awg:22,wps:[{x:1,y:2,z:3}]}},nets:{n:{id:'n',name:'5V'}},texts:{},groups:{}});
test('rotated pads, model heights, hidden parts and mixed waypoint axes are normalized correctly',()=>{
 const p=project(),result=buildAIExport(p);
 assert.deepEqual(nodePosition(p.nodes.a,p.boards),[25,15,7]);
 assert.deepEqual(nodePosition(p.nodes.b,p.boards),[15,35,3]);
 assert.deepEqual(nodePosition(p.nodes.u,p.boards),[20,25,4]);
 assert.deepEqual(result.summary.parts[0].worldBoundsMm,{min:[15,15,3],max:[25,35,7],size:[10,20,4]});
 assert.equal(result.summary.parts[0].hidden,true);
 assert.deepEqual(result.summary.connections[0].waypointsWorldMm,[[1,3,2]]);
 assert.deepEqual(result.summary.unconnectedNodeIds,['b','u']);
 assert.equal(result.summary.connections[0].manufacturingLengthMm,null);
});
test('mesh bounds use normalized geometry, not just box corners',()=>{
 const p=project();p.boards.b.model={vertices:[-.5,-.5,-.5,.5,-.5,-.5,0,.5,.5],size:[20,10,4],format:'stl'};
 const r=buildAIExport(p).summary.parts[0];
 assert.equal(r.geometry.triangleCount,1);
 assert.deepEqual(r.worldBoundsMm,{min:[15,15,3],max:[25,35,7],size:[10,20,4]});
});
test('same net label does not fabricate connections; shared-node mixed nets and broken references are reported',()=>{
 const p=project();p.nodes.k={id:'k',wx:1,wy:2,wz:3};p.nodes.l={id:'l',wx:4,wy:5,wz:6};
 p.wires.second={id:'second',a:'k',b:'l',netId:'n'};
 let r=buildAIExport(p);assert.equal(r.summary.nets[0].connectedComponents.length,2);
 p.nets.m={id:'m',name:'GND'};p.wires.bridge={id:'bridge',a:'j',b:'b',netId:'m'};
 p.wires.bad={id:'bad',a:'missing',b:'b',netId:'missing'};
 r=buildAIExport(p);assert.equal(r.summary.warnings.length,3);
 assert.equal(r.summary.connections.at(-1).from.missing,true);
});
test('complete housing example round-trips with unchanged meshes and metadata',()=>{
 const p=JSON.parse(readFileSync(new URL('../examples/housing-wiring.wnest',import.meta.url),'utf8'));
 const before=JSON.stringify(p),r=buildAIExport(p),reloaded=JSON.parse(JSON.stringify(r));
 assert.equal(JSON.stringify(p),before);
 assert.deepEqual(unwrapProject(reloaded),p);
 assert.equal(r.summary.parts.length,Object.keys(p.boards).length);
 assert.equal(r.summary.connections.length,Object.keys(p.wires).length);
 assert.ok(r.summary.parts.some(b=>b.geometry.triangleCount>0));
 assert.equal(r.summary.warnings.length,0);
 assert.match(r.readme.coordinateSystem.mesh,/every 9 numbers/);
});
test('empty projects, legacy waypoint, filenames and malformed handoffs',()=>{
 const p=project();p.wires.w.wp=p.wires.w.wps[0];delete p.wires.w.wps;
 assert.deepEqual(buildAIExport(p).summary.connections[0].waypointsWorldMm,[[1,3,2]]);
 const empty=buildAIExport({app:'wirenest',v:2,boards:{},nodes:{},wires:{}});
 assert.equal(empty.summary.parts.length,0);
 assert.equal(unwrapProject(p),p);
 assert.throws(()=>unwrapProject({format:'wirenest-ai-handoff',version:2,project:p}));
 assert.equal(aiExportFilename('../bad:name'),'.._bad_name_AI.json');
});
