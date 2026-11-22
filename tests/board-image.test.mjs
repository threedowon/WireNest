import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boardImageHeight,imagePlaneLayout} from '../board-image.js';
import {pcbModel} from './fixtures/pcb-model.mjs';
test('model images use measured substrate despite stale silk and pad heights',()=>{
 const board={id:'b',w:20,d:10,thick:10,model:pcbModel(1.905,3.415),gerberImport:{topHeight:1.6,bottomHeight:0},gerberSilk:{manualHeights:{top:17}}};
 assert.ok(Math.abs(boardImageHeight(board,'top')-3.415)<1e-8);
 assert.ok(Math.abs(boardImageHeight(board,'bottom')-1.905)<1e-8);
 const top=imagePlaneLayout(board,'top'),bottom=imagePlaneLayout(board,'bottom');
 assert.ok(Math.abs(top.height-3.435)<1e-8);assert.equal(top.rotationX,-Math.PI/2);assert.equal(bottom.rotationX,Math.PI/2);
 board.imageHeights={top:5};assert.equal(boardImageHeight(JSON.parse(JSON.stringify(board)),'top'),5);assert.ok(Math.abs(boardImageHeight(board,'bottom')-1.905)<1e-8);
 delete board.imageHeights;assert.ok(Math.abs(boardImageHeight(board,'top')-3.415)<1e-8);
});
test('undetected models use saved planes then extents; simple boards use their actual thickness',()=>{
 const board={w:20,d:30,thick:15,model:{},gerberImport:{topHeight:4,bottomHeight:2}};
 assert.equal(imagePlaneLayout(board,'top').height,4.02);assert.equal(imagePlaneLayout(board,'bottom').height,1.98);
 delete board.gerberImport;assert.equal(imagePlaneLayout(board,'top').height,15.02);
 delete board.model;assert.equal(boardImageHeight(board,'top'),15);
});

test('front and back image scales persist independently without moving the image plane height',()=>{
 const board={w:80,d:60,thick:10,model:{},imageHeights:{top:4},imageScales:{top:1.1,bottom:.5}};
 const saved=JSON.parse(JSON.stringify(board));
 assert.equal(imagePlaneLayout(saved,'top').width,88);assert.equal(imagePlaneLayout(saved,'top').depth,66);assert.equal(imagePlaneLayout(saved,'top').height,4.02);
 assert.equal(imagePlaneLayout(saved,'bottom').width,40);assert.equal(imagePlaneLayout(saved,'bottom').depth,30);
 for(const scale of [0,-1,NaN,Infinity,undefined]){saved.imageScales.top=scale;assert.equal(imagePlaneLayout(saved,'top').width,80);}
});
