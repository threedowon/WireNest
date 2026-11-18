import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planGerberReplacement,replacePCBModel} from '../pcb-replace.js';
const pad=(id,pin,extra={})=>({id,board:'b',name:'J1.'+pin+' / GND',face:'top',u:1,v:2,kind:'gnd',state:true,gerber:{reference:'J1',pin,side:'top',net:'GND'},...extra});
test('Gerber replacement reuses endpoint IDs, updates positions, adds new pins and retains only wired missing pins',()=>{
 const old=[pad('a','1'),pad('b','2'),pad('c','3'),pad('other','9',{board:'other'})];
 const updated=pad(undefined,'1',{u:5,v:7,kind:'signal',state:false}),fresh=pad(undefined,'4');
 const wires=[{a:'b',b:'a'}],result=planGerberReplacement({id:'b'},[updated,fresh],old,wires);
 assert.equal(result.updates[0].id,'a');assert.equal(result.updates[0].u,5);assert.equal(result.updates[0].kind,'gnd');assert.equal(result.updates[0].state,true);
 assert.deepEqual(result.removeIds,['c']);assert.equal(result.retained[0].id,'b');assert.equal(result.retained[0].gerberStale,true);assert.equal(result.additions.length,1);
 assert.equal(old[0].u,1);assert.deepEqual(wires,[{a:'b',b:'a'}]);
});
test('matching distinguishes faces, preserves custom labels and rejects ambiguous repeated pins',()=>{
 const old=pad('a','1',{name:'Power',gerberStale:true});
 assert.equal(planGerberReplacement({id:'b'},[pad(null,'1')],[old],[]).updates[0].name,'Power');
 assert.equal(planGerberReplacement({id:'b'},[pad(null,'1')],[old],[]).updates[0].gerberStale,false);
 assert.throws(()=>planGerberReplacement({id:'b'},[pad(null,'1'),pad(null,'1')],[],[]),/여러 개/);
 const back=pad(null,'1',{face:'bottom',gerber:{reference:'J1',pin:'1',side:'bottom'}});
 assert.equal(planGerberReplacement({id:'b'},[back],[old],[]).updates.length,0);
});
test('model replacement keeps placement, identity, pad mm heights and silk geometry without scaling to new dimensions',()=>{
 const b={id:'b',name:'PCB',x:101,y:-29,z:8,rot:37,w:20,d:30,thick:10,model:{cadYDirection:-1},gerberSilk:{baseSize:[20,30,10],topHeight:7,bottomHeight:5,strokes:[{side:'top',width:.1,points:[[1,2],[3,4]]}]}};
 const nodes=[pad('a','1',{modelHeight:.7})],texts=[{board:'b',v:5}];
 replacePCBModel(b,{size:[25,40,20],cadYDirection:-1,format:'step',vertices:[]},nodes,texts);
 assert.deepEqual([b.id,b.name,b.x,b.y,b.z,b.rot],['b','PCB',101,-29,8,37]);assert.deepEqual([b.w,b.d,b.thick],[25,40,20]);
 assert.equal(nodes[0].u,1);assert.equal(nodes[0].v,12);assert.equal(nodes[0].modelHeight,.35);assert.equal(texts[0].v,15);
 assert.deepEqual(b.gerberSilk.strokes[0].points,[[1,12],[3,14]]);assert.equal(b.gerberSilk.topHeight,7);
 const snapshot=JSON.stringify(b);assert.throws(()=>replacePCBModel(b,{size:[0,1,2]},nodes,texts));assert.equal(JSON.stringify(b),snapshot);
});
