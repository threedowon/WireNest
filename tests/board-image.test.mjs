import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boardImageHeight,boardImageSurface} from '../board-image.js';
import {pcbModel} from './fixtures/pcb-model.mjs';
test('enlarging an image changes UVs only and stays on measured substrate despite old height settings',()=>{
 const b={w:20,d:10,thick:10,model:pcbModel(1.905,3.415),imageHeights:{top:17},gerberImport:{topHeight:1.6},imageScales:{top:1}};
 assert.ok(Math.abs(boardImageHeight(b,'top')-3.415)<1e-8);
 const one=boardImageSurface(b,'top');b.imageScales.top=2;const two=boardImageSurface(JSON.parse(JSON.stringify(b)),'top');
 assert.deepEqual(one.positions,two.positions);assert.equal(two.positions.length,18);
 assert.ok(two.uvs.every(v=>v>=.25&&v<=.75));assert.ok(two.positions.filter((v,i)=>i%3===1).every(y=>Math.abs(y+1.585)<1e-8));
});
test('surface mapping preserves missing triangles (holes), excludes components and side walls',()=>{
 const b={w:20,d:20,thick:10,model:{vertices:[-.5,0,-.5, .5,0,-.5, -.5,0,.5, -.1,.5,-.1,.1,.5,-.1,0,.5,.1, -.5,0,-.5,-.5,.5,-.5,-.5,0,.5]},gerberImport:{topHeight:5},imageScales:{top:3}};
 const s=boardImageSurface(b,'top');assert.equal(s.positions.length,9);assert.ok(s.positions.filter((v,i)=>i%3===1).every(y=>y===0));
});
test('front/back normals face outward and smaller images clip without affecting geometry outside the image',()=>{
 const b={w:20,d:10,thick:2,imageScales:{top:.5}};
 for(const side of ['top','bottom']){const s=boardImageSurface(b,side),p=s.positions;const ny=(p[5]-p[2])*(p[6]-p[0])-(p[3]-p[0])*(p[8]-p[2]);assert.ok(side==='top'?ny>0:ny<0);assert.ok(s.uvs.every(v=>v>=0&&v<=1));}
 const s=boardImageSurface(b,'top');assert.ok(s.positions.filter((v,i)=>i%3===0).every(x=>Math.abs(x)<=5));
});
