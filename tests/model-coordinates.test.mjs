import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeModel,restoreCADOrientation} from '../model-coordinates.js';
import {planGerberNodes,placeBoardPad} from '../gerber-import.js';
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
test('asymmetric CAD preserves handedness and outward normal through Z-up to Y-up rotation',()=>{
 const source=[0,0,0, 4,0,0, 0,3,2],m=normalizeModel(source);
 const pts=[0,3,6].map(i=>m.vertices.slice(i,i+3).map((v,a)=>v*[4,2,3][a]));
 assert.deepEqual(sub(pts[1],pts[0]),[4,0,0]);assert.deepEqual(sub(pts[2],pts[0]),[0,2,-3]);
 assert.deepEqual(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])).map(v=>v||0),[0,12,8]);
 assert.equal(m.cadYDirection,-1);assert.deepEqual(m.size,[4,3,2]);
});
test('new CAD pads coincide with mesh; legacy mapping remains unchanged',()=>{
 const d={name:'test',min:[10,20],width:4,depth:3,thickness:2};
 const p={reference:'J1',pin:'1',x:11,y:21,side:'top'},b={id:'b',w:4,d:3,thick:2,model:{cadYDirection:-1}};
 assert.deepEqual(placeBoardPad(p,d,{},b),[1,2]);
 const n=planGerberNodes(d,b,[p])[0];
 assert.deepEqual([n.u,n.v],[1,2]);
 assert.deepEqual(placeBoardPad(p,d,{}, {...b,model:{}}),[1,1]);
});
test('legacy repair transforms mesh, pads once without breaking wire endpoint IDs',()=>{
 const b={id:'b',d:10,model:{vertices:[0,0,0,1,0,0,0,1,1]}};
 const nodes=[{id:'n',board:'b',u:1,v:2},{id:'other',board:'other',v:3}],texts=[{board:'b',v:4}];
 assert.equal(restoreCADOrientation(b,nodes,texts),true);assert.equal(nodes[0].v,8);assert.equal(nodes[0].id,'n');assert.equal(nodes[1].v,3);assert.equal(texts[0].v,6);
 assert.equal(restoreCADOrientation(b,nodes,texts),false);assert.equal(nodes[0].v,8);
});
