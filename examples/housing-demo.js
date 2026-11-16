import {importModel} from '../model-import.js';

export async function createHousingDemo() {
  const boards={},nodes={},wires={},nets={},texts={};
  async function model(id,file,name,x,y,z,color,role) {
    const response=await fetch(new URL(file,import.meta.url));
    if(!response.ok)throw new Error('예제 모델을 불러오지 못했습니다.');
    const shape=await importModel(new File([await response.blob()],file));
    const [w,d,thick]=shape.size;
    boards[id]={id,name,x,y,z,w,d,thick,rot:0,color,modelRole:role,opacity:role==='housing'?.16:1,model:shape};
  }
  await model('housing','housing.stl','하우징 · 150 × 100 × 32 mm',-75,-50,0,'#9caec0','housing');
  await model('controller','controller-pcb.stl','PCB A · 컨트롤러',-59,-32,7,'#187350','pcb');
  await model('io','io-pcb.stl','PCB B · I/O 모듈',14,-25,7,'#246692','pcb');
  function component(id,board,name,u,v,w,d,thick,color) {
    const base=boards[board];boards[id]={id,name,x:base.x+u,y:base.y+v,z:8.6,w,d,thick,color,rot:0};
  }
  component('mcu','controller','MCU',12,20,17,19,2.5,'#28333b');
  component('usb','controller','USB-C',0,43,9,11,4,'#a5afba');
  component('driver','io','I/O Driver',15,16,17,18,2.5,'#28333b');
  component('terminal','io','출력 터미널',34,8,8,32,6,'#487c53');
  function silk(id,board,text,u,v,size=3) {
    texts[id]={id,board,text,u,v,face:'top',size};
  }
  silk('label-a','controller','CONTROLLER',7,8,3);
  silk('label-b','io','I/O MODULE',6,43,3);
  const signals=[['5V','#ec514c','power'],['GND','#404858','gnd'],['SDA','#18a9c0','signal'],['SCL','#e3a12b','signal']];
  signals.forEach(([name,color,kind],i)=>{
    const netId='net'+i;nets[netId]={id:netId,name,color};
    const a='a'+i,b='b'+i;
    nodes[a]={id:a,board:'controller',u:48,v:19+i*8,modelHeight:1,face:'top',name,kind,size:2.4,state:false};
    nodes[b]={id:b,board:'io',u:6,v:12+i*8,modelHeight:1,face:'top',name,kind,size:2.4,state:false};
    const id='wire'+i;
    wires[id]={id,a,b,awg:20,netId,color:null,wps:[{x:0,y:16+i*.8,z:-13+i*8},{x:10,y:16+i*.8,z:-13+i*8}]};
  });
  return {app:'wirenest',v:2,name:'하우징 내부 배선 예제',boards,nodes,wires,nets,texts,groups:{},uid:1000};
}
