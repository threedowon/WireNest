import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseGerber} from '../gerber-import.js';
import {planGerberSilk,silkVertices} from '../gerber-silk.js';
const header='%TF.FileFunction,Legend,Top*%%FSLAX46Y46*%%MOMM*%%LPD*%%ADD10C,0.15*%D10*';
test('silk preserves stroke widths, arcs and filled shapes without inferring text',()=>{
 const g=parseGerber(header+'G01*X0Y0D02*X1000000Y0D01*G75*G03*X0Y1000000I-1000000J0D01*G36*G01*X0Y0D02*X1000000Y0D01*X0Y1000000D01*X0Y0D01*G37*');
 assert.equal(g.strokes.length,3);assert.equal(g.strokes[0].width,.15);assert.ok(g.strokes[1].points.length>10);assert.equal(g.strokes[2].filled,true);assert.equal(g.pads.length,0);
 assert.throws(()=>parseGerber(header+'%LPC*%X0Y0D02*X1000000Y0D01*'),/지원/);
});
test('nearby silk is side scoped and follows the same pad transform and model surface',()=>{
 const data={min:[10,20],width:20,depth:30,thickness:1.6,silk:[{side:'top',width:.2,points:[[11,21],[12,21]]},{side:'bottom',width:.2,points:[[11,21],[12,21]]},{side:'top',width:.2,points:[[28,48],[29,48]]}]};
 const board={w:30,d:20,thick:10};
 const silk=planGerberSilk(data,board,[{side:'top',x:11,y:21}],{rotation:90,topHeight:7},8);
 assert.equal(silk.strokes.length,1);assert.deepEqual(silk.strokes[0].points,[[29,1],[29,2]]);
 const vertices=silkVertices(silk,board);assert.equal(vertices.length,18);assert.ok(Math.abs(vertices[1]-2.035)<1e-9);
 assert.equal(planGerberSilk(data,board,[{side:'top',x:11,y:21}],{},Infinity).strokes.length,2);
});

test('F/B silk selection is independent of pad side and preserves surface heights',()=>{
 const data={min:[0,0],width:20,depth:20,thickness:2,silk:['top','bottom'].map(side=>({side,width:.2,points:[[1,1],[2,1]]}))};
 const board={w:20,d:20,thick:10},pads=[{x:1,y:1,side:'top'}];
 const opts={silkSide:'bottom',topHeight:7,bottomHeight:5};
 const back=planGerberSilk(data,board,pads,opts);
 assert.deepEqual(back.strokes.map(s=>s.side),['bottom']);
 assert.ok(Math.abs(silkVertices(back,board)[1]+.035)<1e-9);
 assert.deepEqual(planGerberSilk(data,board,pads,{silkSide:'top'}).strokes.map(s=>s.side),['top']);
 assert.equal(planGerberSilk(data,board,pads,{silkSide:'both'}).strokes.length,2);
 assert.equal(planGerberSilk(data,board,[],opts,Infinity).strokes.length,1);
 assert.equal(planGerberSilk(data,board,[],opts).strokes.length,0);
});

test('silk follows raised pads on the same board and side, including saved anchors',()=>{
 const board={id:'pcb',w:20,d:20,thick:20};
 const silk={baseSize:[20,20,20],topHeight:3.4,bottomHeight:1.9,strokes:['top','bottom'].map(side=>({side,width:.2,points:[[1,1],[2,1]]}))};
 const pads=[{id:'a',board:'pcb',face:'top',modelHeight:17/20},{id:'b',board:'pcb',face:'top',modelHeight:17/20},{id:'c',board:'pcb',face:'top',modelHeight:3.4/20},{id:'d',board:'pcb',face:'bottom',modelHeight:2/20},{id:'other',board:'other',face:'top',modelHeight:50}];
 let vertices=silkVertices(silk,board,null,pads);assert.ok(Math.abs(vertices[1]-7.035)<1e-9);assert.ok(Math.abs(vertices[19]+8.035)<1e-9);
 silk.heightPadIds={top:['c']};vertices=silkVertices(JSON.parse(JSON.stringify(silk)),board,null,pads);assert.ok(Math.abs(vertices[1]+6.565)<1e-9);
 pads[2].modelHeight=18/20;assert.ok(Math.abs(silkVertices(silk,board,null,pads)[1]-8.035)<1e-9);
 silk.heightPadIds={top:['deleted']};assert.ok(Math.abs(silkVertices(silk,board,null,pads)[1]-7.035)<1e-9);
});
