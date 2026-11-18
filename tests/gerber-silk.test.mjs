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
