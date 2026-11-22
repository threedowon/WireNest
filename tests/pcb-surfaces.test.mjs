import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectPCBSurfaces} from '../pcb-surfaces.js';
import {planGerberNodes} from '../gerber-import.js';
import {planGerberSilk,silkVertices} from '../gerber-silk.js';

import {pcbModel} from './fixtures/pcb-model.mjs';
const board=model=>({id:'b',w:20,d:10,thick:10,model});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('PCB surfaces exclude pins below the substrate and tall components above it',()=>{
  const surfaces=detectPCBSurfaces(board(pcbModel()),1.6);
  close(surfaces.bottomHeight,3);close(surfaces.topHeight,4.6);
});

test('nominal Gerber thickness allows a thinner STEP substrate without moving its faces',()=>{
  const surfaces=detectPCBSurfaces(board(pcbModel(1.905,3.415)),1.6);
  assert.ok(surfaces,'1.51 mm substrate should match a nominal 1.6 mm board');
  close(surfaces.bottomHeight,1.905);close(surfaces.topHeight,3.415);
});

test('front/back pads and silk share the detected PCB planes through save and reopen',()=>{
  const b=board(pcbModel()),options=detectPCBSurfaces(b,1.6);
  const data={name:'slave',min:[0,0],width:20,depth:10,thickness:1.6,
    silk:['top','bottom'].map(side=>({side,width:.1,points:[[2,3],[3,3]]}))};
  const pads=['top','bottom'].map(side=>({side,reference:'J1',pin:'1',x:2,y:3}));
  const saved=JSON.parse(JSON.stringify({nodes:planGerberNodes(data,b,pads,options),silk:planGerberSilk(data,b,pads,options)}));
  close(saved.nodes[0].modelHeight*b.thick,4.6);close(saved.nodes[1].modelHeight*b.thick,3);
  assert.deepEqual(saved.nodes.map(n=>n.face),['top','bottom']);
  const vertices=silkVertices(saved.silk,b);
  close(vertices[1]+5,4.635);close(vertices[19]+5,2.965);
});

test('uncertain meshes and mismatched thickness do not silently guess a PCB surface',()=>{
  assert.equal(detectPCBSurfaces(board({vertices:[0,0,0,1,0,0,0,1,1]}),1.6),null);
  assert.equal(detectPCBSurfaces(board(pcbModel()),2),null);
  const m=pcbModel();m.vertices.push(...pcbModel(6,7.6).vertices);
  assert.equal(detectPCBSurfaces(board(m),1.6),null);
  assert.deepEqual(detectPCBSurfaces({thick:1.6},1.6),{bottomHeight:0,topHeight:1.6});
});
