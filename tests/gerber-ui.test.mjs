import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attachGerberImport} from '../gerber-ui.js';
const header=fn=>'%TF.FileFunction,'+fn+'*%%FSLAX46Y46*%%MOMM*%%LPD*%';
const files=[new File([header('Profile,NP')+'G01*X0Y0D02*X20000000Y0D01*X20000000Y10000000D01*X0Y10000000D01*X0Y0D01*'],'Edge_Cuts.gbr'),new File([header('Copper,L1,Top')+'%TA.AperFunction,ComponentPad*%%ADD10C,2*%%TD*%D10*%TO.P,J1,1*%%TO.N,GND*%X2000000Y3000000D03*'],'F_Cu.gbr')];
function fixture(importPCB){
 const prior=globalThis.document,added=[],state={project:{name:'test'},boards:{},nodes:{}};let changes=0,next=0;
 function element(tag){
  const children=[],ids=new Map(),events={};let html='';
  return {tag,value:'',checked:false,files:[],open:false,disabled:false,children,
   append:child=>children.push(child),click(){},setAttribute(){},addEventListener:(name,fn)=>events[name]=fn,
   showModal(){this.open=true;},close(){this.open=false;events.close?.();},
   querySelector(selector){if(selector.startsWith('#'))return ids.get(selector.slice(1));return children.find(c=>c.value==='__step__')||null;},
   set innerHTML(value){html=value;ids.clear();for(const m of value.matchAll(/<(input|select|button|div|p|label)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const el=element(m[1]);el.value=m[0].match(/\bvalue="([^"]*)"/)?.[1]||'';
    if(m[1]==='select'){const rest=value.slice(m.index+m[0].length);el.value=rest.match(/<option[^>]*value="([^"]*)"/)?.[1]??rest.match(/<option>([^<]*)/)?.[1]??'';}
    ids.set(m[2],el);
   }},get innerHTML(){return html;}
  };
 }
 globalThis.document={createElement:element,body:{append:el=>added.push(el)}};
 const launch=attachGerberImport({getState:()=>state,createId:()=>String(++next),beforeChange:()=>changes++,afterChange(){},importPCB});
 const [input,dialog,stepInput]=added,el=id=>dialog.querySelector('#'+id);
 return {state,dialog,stepInput,el,get changes(){return changes;},async open(request){launch(request);input.files=files;await input.onchange();},async step(){stepInput.files=[new File(['STEP'],'my-pcb.step')];await stepInput.onchange();},restore(){globalThis.document=prior;}};
}
const model={size:[20,10,8],format:'step',vertices:[-.5,-.5,-.5,.5,-.5,-.5,0,.5,.5]};
test('STEP and pads are staged, then applied together without generating a placeholder PCB',async()=>{
 const f=fixture(async()=>model);try{
  await f.open();assert.equal(f.el('gbApply').disabled,true);assert.equal(f.state.boards.constructor,Object);
  await f.step();assert.equal(f.el('gbTarget').value,'__step__');assert.deepEqual(f.state.boards,{});assert.equal(f.changes,0);
  assert.equal(f.el('gbApply').disabled,true);f.el('gbAligned').checked=true;f.el('gbAligned').onchange();
  assert.equal(f.el('gbApply').disabled,false);f.el('gbApply').onclick();
  assert.equal(Object.keys(f.state.boards).length,1);const b=Object.values(f.state.boards)[0],n=Object.values(f.state.nodes)[0];
  assert.equal(b.model,model);assert.equal(b.name,'my-pcb');assert.equal(b.thick,8);
  assert.equal(n.board,b.id);assert.equal(n.modelHeight,.2);assert.equal(n.u,2);assert.equal(n.v,3);assert.equal(f.changes,1);
 }finally{f.restore();}
});
test('cancel discards staged STEP; late conversion cannot mutate a closed dialog or project',async()=>{
 let release;const f=fixture(()=>new Promise(resolve=>release=resolve));try{
  await f.open();const loading=f.step();f.dialog.close();release(model);await loading;
  assert.deepEqual(f.state.boards,{});assert.deepEqual(f.state.nodes,{});assert.equal(f.changes,0);
 }finally{f.restore();}
});
test('failed STEP conversion leaves the project untouched and permits retry',async()=>{
 const f=fixture(async()=>{throw Error('invalid STEP');});try{
  await f.open();await f.step();assert.match(f.el('gbStatus').textContent,/invalid STEP/);
  assert.equal(f.el('gbPickStep').disabled,false);assert.equal(f.el('gbApply').disabled,true);assert.equal(f.changes,0);
 }finally{f.restore();}
});


test('inspector replacement locks the target, preserves placement and reuses wired pin IDs',async()=>{
 const f=fixture(async()=>model);try{
  f.state.boards.pcb={id:'pcb',name:'existing',x:100,y:-25,z:7,rot:33,w:20,d:10,thick:8,model,gerberImport:{topHeight:3,bottomHeight:1,silkSide:'bottom'}};
  f.state.nodes.old={id:'old',board:'pcb',face:'top',u:1,v:1,name:'J1.1 / GND',kind:'gnd',state:true,gerber:{reference:'J1',pin:'1',side:'top',net:'GND'}};
  f.state.wires={wire:{a:'old',b:'outside'}};
  await f.open({replaceBoardId:'pcb'});
  assert.equal(f.el('gbTarget').value,'pcb');assert.equal(f.el('gbTarget').disabled,true);assert.equal(f.el('gbPickStep').hidden,true);
  assert.equal(f.el('gbTop').value,'3');assert.equal(f.el('gbSilkSide').value,'bottom');
  f.el('gbAligned').checked=true;f.el('gbAligned').onchange();f.el('gbApply').onclick();
  assert.equal(f.changes,1);assert.deepEqual(Object.keys(f.state.nodes),['old']);assert.equal(f.state.nodes.old.u,2);assert.equal(f.state.nodes.old.v,3);
  assert.deepEqual([f.state.boards.pcb.x,f.state.boards.pcb.y,f.state.boards.pcb.z,f.state.boards.pcb.rot],[100,-25,7,33]);assert.equal(f.state.wires.wire.a,'old');
 }finally{f.restore();}
});
