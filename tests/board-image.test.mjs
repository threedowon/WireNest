import {test} from 'node:test';
import assert from 'node:assert/strict';
import {imagePlaneLayout} from '../board-image.js';
test('model images use current silk height and opposite outward-facing planes',()=>{
 const board={id:'b',w:83,d:78,thick:17.3,model:{},gerberSilk:{baseSize:[83,78,17.3],topHeight:1.6,bottomHeight:0,manualHeights:{top:17}}};
 const top=imagePlaneLayout(board,'top'),bottom=imagePlaneLayout(board,'bottom');
 assert.equal(top.height,17.02);assert.equal(top.rotationX,-Math.PI/2);assert.equal(top.width,83);assert.equal(top.depth,78);
 assert.equal(bottom.height,-.02);assert.equal(bottom.rotationX,Math.PI/2);
 delete board.gerberSilk.manualHeights;
 assert.equal(imagePlaneLayout(board,'top',[{board:'b',face:'top',modelHeight:11/17.3}]).height,11.02);
});
test('images without silk honor saved PCB planes or model extents',()=>{
 const board={w:20,d:30,thick:15,model:{},gerberImport:{topHeight:4,bottomHeight:2}};
 assert.equal(imagePlaneLayout(board,'top').height,4.02);assert.equal(imagePlaneLayout(board,'bottom').height,1.98);
 delete board.gerberImport;assert.equal(imagePlaneLayout(board,'top').height,15.02);
});
