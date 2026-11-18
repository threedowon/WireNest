import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGerber,parseGerberSet,placePad,planGerberNodes,readGerberZip} from '../gerber-import.js';
import {buildAIExport} from '../ai-export.js';
const header=fn=>'%TF.FileFunction,'+fn+'*%%TF.ProjectId,Test,uuid,1*%%FSLAX46Y46*%%MOMM*%%LPD*%';
const outline={name:'Edge_Cuts.gbr',text:header('Profile,NP')+'G01*X10000000Y-20000000D02*X30000000Y-20000000D01*X30000000Y-10000000D01*X10000000Y-10000000D01*X10000000Y-20000000D01*M02*'};
const copper={name:'F_Cu.gbr',text:header('Copper,L1,Top')+'%TA.AperFunction,ComponentPad*%%ADD10C,2*%%TD*%D10*%TO.P,J1,1,VCC*%%TO.N,+5V*%X12000000Y-18000000D03*%TO.P,J1,2,GND*%%TO.N,GND*%X14000000Y-18000000D03*%TD*%X15000000Y-18000000D03*%TA.AperFunction,ViaPad*%%ADD11C,.6*%%TD*%D11*%TO.P,V1,1*%X16000000Y-18000000D03*M02*'};
const data=()=>parseGerberSet([outline,copper]);
test('X2 component flashes preserve pin/net metadata; unlabelled flashes and vias are excluded',()=>{
 const d=data();assert.equal(d.pads.length,2);assert.equal(d.width,20);assert.equal(d.depth,10);
 assert.deepEqual(d.pads[0],{reference:'J1',pin:'1',pinFunction:'VCC',net:'+5V',x:12,y:-18,side:'top',source:'F_Cu.gbr'});
 assert.deepEqual(placePad(d.pads[0],d),[2,2]);
});
test('top and bottom are distinct, region fills and clear flashes cannot create pads',()=>{
 const back={name:'B_Cu.gbr',text:copper.text.replace('Copper,L1,Top','Copper,L2,Bot')};
 assert.equal(parseGerberSet([outline,copper,back]).pads.length,4);
 const clear=parseGerber(copper.text.replace('X12000000Y-18000000D03*','G36*X12000000Y-18000000D03*G37*%LPC*%'));
 assert.equal(clear.pads.length,0);
});
test('rotation and optional Y mirroring preserve scale and create explicit surface heights',()=>{
 const d=data(),p=d.pads[0];assert.deepEqual(placePad(p,d,{rotation:90}),[8,2]);
 assert.deepEqual(placePad(p,d,{rotation:180}),[18,8]);assert.deepEqual(placePad(p,d,{rotation:270}),[2,18]);
 assert.deepEqual(placePad(p,d,{mirrorY:true,offsetX:3,offsetY:4}),[5,12]);
 const b={id:'pcb',w:20,d:10,thick:8};const nodes=planGerberNodes(d,b,d.pads,{topHeight:1.6});
 assert.equal(nodes[0].modelHeight,.2);assert.equal(nodes[0].gerber.net,'+5V');assert.equal(nodes[0].face,'top');
 assert.equal(planGerberNodes(d,b,d.pads,{},nodes).length,0);
 assert.throws(()=>planGerberNodes(d,b,d.pads,{offsetX:100}),/보드 범위/);
 assert.throws(()=>planGerberNodes(d,b,d.pads,{topHeight:NaN}),/높이/);
});
test('arcs include cardinal extrema in profile bounds, not just endpoints',()=>{
 const arc=parseGerber(header('Profile,NP')+'G75*G01*X1000000Y0D02*G03*X-1000000Y0I-1000000J0D01*G01*X1000000Y0D01*');
 assert.ok(arc.segments[0].some(p=>Math.abs(p[0])<1e-9&&Math.abs(p[1]-1)<1e-9));
});
test('inch units, modal coordinates and escaped X2 labels are decoded',()=>{
 const text=copper.text.replace('%MOMM*%','%MOIN*%').replace('J1,1,VCC','J\\u0031,1,VCC').replace('X14000000Y-18000000D03*','X14000000D03*');
 const r=parseGerber(text);assert.equal(r.pads[0].reference,'J1');assert.equal(r.pads[1].y,-457.2);
});
test('unsupported transforms, multiple boards, absent X2 attributes and mismatched origins fail explicitly',()=>{
 assert.throws(()=>parseGerber(copper.text+'%SRX2Y2I1J1*%'),/지원/);
 assert.throws(()=>parseGerber(copper.text.replace('FSLAX','FSTAX')),/절대 좌표/);
 assert.throws(()=>parseGerberSet([copper]),/외곽/);
 assert.throws(()=>parseGerberSet([outline,copper,{...copper,name:'duplicate.gbr'}]),/중복/);
 assert.throws(()=>parseGerberSet([outline,{...copper,text:copper.text.replace('ProjectId,Test','ProjectId,Other')}]),/서로 다른/);
 assert.throws(()=>parseGerberSet([outline,{...copper,text:copper.text.replace('X12000000','X99000000')}]),/좌표/);
 assert.throws(()=>parseGerberSet([outline,{...copper,text:copper.text.replaceAll('TO.P,','TO.C,')}]),/핀 정보/);
});
test('PCB net membership survives project JSON and AI export without creating harness wires',()=>{
 const d=data(),b={id:'pcb',x:0,y:0,z:0,w:20,d:10,thick:1.6},nodes=Object.fromEntries(planGerberNodes(d,b,d.pads).map((n,i)=>['n'+i,{...n,id:'n'+i}]));
 const p=JSON.parse(JSON.stringify({app:'wirenest',v:2,boards:{pcb:b},nodes,wires:{}})),handoff=buildAIExport(p);
 assert.equal(handoff.summary.connections.length,0);assert.equal(handoff.summary.pcbNets.length,2);
 assert.equal(handoff.summary.connectionPoints[0].pcbPad.reference,'J1');
});
test('supplied private ZIP parses locally when explicitly provided', {skip:!process.env.WIRENEST_GERBER_ZIP},async()=>{
 const bytes=readFileSync(process.env.WIRENEST_GERBER_ZIP),files=await readGerberZip(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const d=parseGerberSet(files);assert.ok(d.pads.length>0);assert.ok(d.width>0&&d.depth>0);
 const board={id:'pcb',w:d.width,d:d.depth,thick:d.thickness};
 assert.equal(planGerberNodes(d,board,d.pads).length,d.pads.length);
 const corrupt=Uint8Array.from(bytes);corrupt[0]=0;await assert.rejects(()=>readGerberZip(corrupt.buffer));
 console.log(JSON.stringify({pads:d.pads.length,top:d.pads.filter(p=>p.side==='top').length,bottom:d.pads.filter(p=>p.side==='bottom').length,width:d.width,depth:d.depth}));
});
