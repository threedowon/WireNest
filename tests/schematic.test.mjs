import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {schematicCards,schematicGeometry,wirePath} from '../schematic.js';
const state=()=>({boards:{b:{id:'b',name:'slave',x:10,y:20,hidden:true},c:{id:'c',name:'slot'},h:{id:'h',modelRole:'housing'}},nodes:{a:{id:'a',board:'b',name:'J1.2',gerber:{reference:'J1',pin:'2'},face:'top'},b:{id:'b',board:'b',name:'J1.1',gerber:{reference:'J1',pin:'1'},face:'bottom'},c:{id:'c',board:'c',name:'A'},d:{id:'d',name:'junction'},h:{id:'h',board:'h',name:'housing'}},wires:{},nets:{},schematicLayout:{}});
test('connector grouping preserves endpoint IDs, hidden PCB pins and free junctions; housings are excluded',()=>{
 const s=state(),cards=schematicCards(s);assert.equal(cards.length,3);const slave=cards.find(c=>c.title==='slave');assert.deepEqual(slave.nodes.map(n=>n.id),['b','a']);assert.equal(slave.connector,'J1');assert.equal(schematicGeometry(s).ports.size,4);
});
test('moving a schematic card survives JSON without moving the board or 3D waypoints',()=>{
 const s=state(),card=schematicCards(s).find(c=>c.title==='slave');s.wires.w={id:'w',a:'a',b:'c',wps:[{x:1,y:2,z:3}]};s.schematicLayout[card.key]={x:600,y:-120};const restored=JSON.parse(JSON.stringify(s)),geometry=schematicGeometry(restored);assert.equal(geometry.ports.get('a').x,600);assert.equal(restored.boards.b.x,10);assert.deepEqual(restored.wires.w.wps,[{x:1,y:2,z:3}]);assert.ok(wirePath(geometry.ports.get('a'),geometry.ports.get('c')).startsWith('M '));
});
test('same connector wiring routes outside its card, not across the pin labels',()=>{
 const s=state(),g=schematicGeometry(s),a=g.ports.get('a'),b=g.ports.get('b');assert.equal(wirePath(a,b),`M ${a.right} ${a.y} H ${a.right+30} V ${b.y} H ${b.right}`);
});
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('shared wire creation rejects duplicates, reversed duplicates, self-loops and missing pins',()=>{
 const s=state();s.defaultAwg=24;s.defaultNet='fallback';s.nodes.a.netId='A';let snapshots=0,renders=0,id=0;
 const ctx=vm.createContext({S:s,wlist:()=>Object.values(s.wires),pushUndo:()=>snapshots++,markDirty(){},nid:()=>String(++id),recompute(){},rebuild:()=>renders++,toast(){}});
 vm.runInContext(html.slice(html.indexOf('function addWire('),html.indexOf('function addNet(')),ctx);
 const wid=ctx.addWire('a','c');assert.equal(s.wires[wid].netId,'A');assert.equal(s.wires[wid].awg,24);assert.equal(s.wires[wid].wps,undefined);
 ctx.addWire('a','c');ctx.addWire('c','a');ctx.addWire('a','a');ctx.addWire('missing','a');assert.equal(Object.keys(s.wires).length,1);assert.equal(snapshots,1);assert.equal(renders,1);
});
test('project serialization and undo snapshots retain the schematic layout',()=>{
 const S=state();S.project={name:'test'};S.schematicLayout.test={x:17,y:29};const ctx=vm.createContext({S,uid:10});
 vm.runInContext(html.slice(html.indexOf('function serialize()'),html.indexOf('function loadData(')),ctx);
 vm.runInContext(html.slice(html.indexOf('function snapState()'),html.indexOf('function pushUndo()')),ctx);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.serialize())).schematicLayout,{test:{x:17,y:29}});assert.deepEqual(JSON.parse(ctx.snapState()).schematicLayout,{test:{x:17,y:29}});
});
