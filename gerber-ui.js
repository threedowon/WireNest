import {planGerberSilk} from './gerber-silk.js?v=3';
import {readGerberFiles,placeBoardPad,planGerberNodes} from './gerber-import.js?v=2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function attachGerberImport({getState,createId,beforeChange,afterChange,importPCB}){
  const input=document.createElement('input');input.type='file';input.accept='.zip,.gbr,.gbrjob';input.multiple=true;input.hidden=true;document.body.append(input);
  const dialog=document.createElement('dialog');dialog.className='gerber-dialog';dialog.setAttribute('aria-label','KiCad 거버 패드 가져오기');document.body.append(dialog);
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  let data,project,refs=[],selected=new Set(),reading=false,staged=null,stepBusy=false,stepGeneration=0;
  const stepInput=document.createElement('input');stepInput.type='file';stepInput.accept='.step,.stp';stepInput.hidden=true;document.body.append(stepInput);
  dialog.addEventListener('close',()=>{stepGeneration++;stepBusy=false;staged=null;});
  const el=id=>dialog.querySelector('#'+id);
  function options(){return {rotation:Number(el('gbRotation').value),mirrorY:el('gbMirror').checked,offsetX:Number(el('gbX').value),offsetY:Number(el('gbY').value),topHeight:Number(el('gbTop').value),bottomHeight:Number(el('gbBottom').value),silkSide:el('gbSilkSide').value};}
  function dimensions(){const rotated=Number(el('gbRotation').value)%180;return {w:rotated?data.depth:data.width,d:rotated?data.width:data.depth};}
  function board(){return (el('gbTarget').value==='__step__'?staged:getState().boards[el('gbTarget').value])||{id:'new',...dimensions(),thick:data.thickness};}
  function pads(){const side=el('gbSide').value;return data.pads.filter(p=>selected.has(p.reference)&&(side==='both'||p.side===side));}
  function silkPlan(b,chosen,opts){return el('gbSilk').value==='none'?null:planGerberSilk(data,b,chosen,opts,el('gbSilk').value==='all'?Infinity:8);}
  function render(){
    const query=el('gbSearch').value.toLowerCase();
    el('gbRefs').innerHTML=refs.map((r,i)=>r.toLowerCase().includes(query)?'<label><input type="checkbox" data-ref="'+i+'" '+(selected.has(r)?'checked':'')+'> '+esc(r)+' <small>'+data.pads.filter(p=>p.reference===r&&(el('gbSide').value==='both'||p.side===el('gbSide').value)).length+'개</small></label>':'').join('');
    const b=board(),opts=options(),chosen=pads(),existing=Object.values(getState().nodes);
    let planned=[];try{
      planned=planGerberNodes(data,b,chosen,opts,existing);
      const silk=silkPlan(b,chosen,opts),front=silk?.strokes.filter(s=>s.side==='top').length||0,back=silk?.strokes.filter(s=>s.side==='bottom').length||0;
      el('gbStatus').textContent=chosen.length+'개 선택 · '+planned.length+'개 새 연결점'+(chosen.length-planned.length?' · 중복 '+(chosen.length-planned.length)+'개 건너뜀':'')+(silk?' · 실크 도형 F '+front+' / B '+back+(front+back===0?' (선택한 면·범위에 실크 없음)':''):'');
      el('gbApply').disabled=stepBusy||!el('gbTarget').value||(!planned.length&&!silk?.strokes.length)||!el('gbAligned').checked;
    }catch(e){el('gbStatus').textContent=e.message;el('gbApply').disabled=true;}
    el('gbSilkSide').disabled=el('gbSilk').value==='none';
    el('gbAlignLabel').hidden=!el('gbTarget').value;
    el('gbPickStep').disabled=stepBusy;el('gbPickStep').textContent=stepBusy?'STEP 변환 중…':'PCB STEP 파일 선택…';
    if(stepBusy)el('gbStatus').textContent='STEP 형상을 읽는 중입니다. 아직 프로젝트에 추가하지 않았습니다.';
    else if(!el('gbTarget').value)el('gbStatus').textContent='패드를 적용할 PCB STEP 파일을 선택하거나 기존 PCB를 지정하세요.';
    el('gbSize').textContent='거버 외곽 '+data.width.toFixed(3)+' × '+data.depth.toFixed(3)+' mm · 대상 '+b.w.toFixed(3)+' × '+b.d.toFixed(3)+' mm · 확대/축소 없이 1:1 배치';
    const points=chosen.map(p=>({p,xy:placeBoardPad(p,data,opts,b)})),outline=data.outline.map(line=>line.map(([x,y])=>placeBoardPad({x,y},data,opts,b)));
    const xs=[0,b.w,...outline.flat().map(p=>p[0])],ys=[0,b.d,...outline.flat().map(p=>p[1])],minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys),margin=Math.max(maxX-minX,maxY-minY)*.04||2;
    const radius=Math.max(b.w,b.d)/180;
    el('gbPreview').innerHTML='<svg role="img" aria-label="위에서 본 패드 위치 미리보기" viewBox="'+[minX-margin,minY-margin,maxX-minX+2*margin,maxY-minY+2*margin].join(' ')+'"><rect x="0" y="'+0+'" width="'+b.w+'" height="'+b.d+'" fill="#18392e" stroke="#8faeaa" stroke-width=".25"/>'+outline.map(line=>'<polyline fill="none" stroke="#f8ce71" stroke-width=".35" points="'+line.map(([x,y])=>x+','+y).join(' ')+'"/>').join('')+points.map(({p,xy:[x,y]})=>'<circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="'+(p.side==='top'?'#ff9d5c':'#70baff')+'"><title>'+esc(p.reference+'.'+p.pin+' / '+p.net+' ('+p.side+')')+'</title></circle>').join('')+'</svg>';
  }
  function show(){
    refs=[...new Set(data.pads.map(p=>p.reference))].sort((a,b)=>Number(/^(J|TP)\d/i.test(b))-Number(/^(J|TP)\d/i.test(a))||a.localeCompare(b,undefined,{numeric:true}));selected=new Set(refs.filter(r=>/^(J|TP)\d/i.test(r)));
    dialog.innerHTML='<h2>KiCad 거버에서 연결점 가져오기</h2><p>PCB STEP을 선택한 뒤, 적용할 커넥터와 위치를 확인하세요. 주황 = 앞면 · 파랑 = 뒷면 · 노랑 = 거버 외곽. 같은 핀의 앞·뒷면은 별도 연결점입니다.</p><div class="gb-grid"><div><div class="gb-actions"><button type="button" id="gbPickStep">PCB STEP 파일 선택…</button></div><label>적용할 PCB<select id="gbTarget"><option value="">PCB STEP 파일 또는 기존 PCB 선택</option>'+Object.values(getState().boards).filter(b=>b.modelRole!=='housing').map(b=>'<option value="'+esc(b.id)+'">'+esc(b.name)+'</option>').join('')+'</select></label><div class="gb-controls"><label>패드 면<select id="gbSide"><option value="top">앞면</option><option value="bottom">뒷면</option><option value="both">양면</option></select></label><label>평면 회전<select id="gbRotation"><option>0</option><option>90</option><option>180</option><option>270</option></select></label><label><input type="checkbox" id="gbMirror"> Y 반전</label><label>X 이동 (mm)<input id="gbX" type="number" step=".1" value="0"></label><label>Y 이동 (mm)<input id="gbY" type="number" step=".1" value="0"></label><label>앞면 높이 (mm)<input id="gbTop" type="number" step=".1" value="'+data.thickness+'"></label><label>뒷면 높이 (mm)<input id="gbBottom" type="number" step=".1" value="0"></label></div><p>높이는 대상 모델 바닥 기준입니다. STEP에는 부품 높이가 포함될 수 있으므로 실제 PCB 동박면 높이를 확인하세요.</p><label>실크 면<select id="gbSilkSide"><option value="top">F · 앞면 (F.SilkS)</option><option value="bottom">B · 뒷면 (B.SilkS)</option><option value="both">F + B · 양면</option></select></label><label>실크 범위<select id="gbSilk"><option value="near">연결점 주변 8mm</option><option value="all">선택한 면 전체</option><option value="none">가져오지 않음</option></select></label><p>패드 면과 별도로 실크 면을 선택합니다. 실크는 각 면의 원래 높이에 표시하며, 가져오면 기존 실크를 선택한 결과로 교체합니다. 자동 부품 번호 라벨은 숨기며 패드를 선택하면 정보를 확인할 수 있습니다.</p><label>부품 검색<input id="gbSearch" placeholder="예: J1, TP"></label><div class="gb-actions"><button type="button" id="gbConnectors">커넥터·테스트포인트</button><button type="button" id="gbAll">전체 선택</button><button type="button" id="gbNone">선택 해제</button></div><div id="gbRefs"></div></div><div><p id="gbSize"></p><div id="gbPreview"></div><p>위에서 본 보드 로컬 XY (오른쪽 +X, 아래쪽 +Y · CAD 원본은 Y 방향을 자동 변환). STEP은 경계 상자만 표시합니다. 아래 확인 후 3D에서 실제 형상과 대조하세요.</p><label id="gbAlignLabel"><input id="gbAligned" type="checkbox"> 대상 PCB의 방향·원점·동박면 높이를 확인했습니다.</label></div></div><p id="gbStatus" role="status"></p><p>부품·핀·네트 이름은 저장됩니다. 동박 도형이나 내부 트랙, 보드 사이 케이블은 생성하지 않습니다.</p><div class="gb-actions"><button type="button" id="gbCancel">취소</button><button type="button" id="gbApply">연결점 가져오기</button></div>';
    const selectedBoard=getState().sel?.t==='board'?getState().sel.id:null;if(selectedBoard&&getState().boards[selectedBoard]?.modelRole!=='housing')el('gbTarget').value=selectedBoard;
    el('gbPickStep').onclick=()=>stepInput.click();
    el('gbCancel').onclick=()=>dialog.close();el('gbSearch').oninput=render;
    el('gbRefs').onchange=e=>{if(e.target.dataset.ref===undefined)return;const ref=refs[Number(e.target.dataset.ref)];e.target.checked?selected.add(ref):selected.delete(ref);render();};
    el('gbConnectors').onclick=()=>{selected=new Set(refs.filter(r=>/^(J|TP)\d/i.test(r)));render();};el('gbAll').onclick=()=>{selected=new Set(refs);render();};el('gbNone').onclick=()=>{selected.clear();render();};
    for(const id of ['gbTarget','gbSide','gbRotation','gbMirror','gbX','gbY','gbTop','gbBottom','gbSilk','gbSilkSide','gbAligned'])el(id).onchange=()=>{if(id!=='gbAligned')el('gbAligned').checked=false;render();};
    el('gbApply').onclick=()=>{
      if(getState().project!==project){dialog.close();alert('프로젝트가 변경되었습니다. 다시 가져오세요.');return;}
      try{
        if(stepBusy||!el('gbTarget').value||!el('gbAligned').checked)return;
        const state=getState(),b=board(),isNew=el('gbTarget').value==='__step__';
        const planned=planGerberNodes(data,b,pads(),options(),Object.values(state.nodes));const silk=silkPlan(b,pads(),options());if(!planned.length&&!silk?.strokes.length)return;
        beforeChange();if(silk?.strokes.length){b.gerberSilk=silk;b.hideGerberLabels=true;}if(isNew){b.id=createId();state.boards[b.id]=b;}
        for(const n of planned){const id=createId();state.nodes[id]={...n,id,board:b.id};}
        b.gerberImport={project:data.name,files:data.files,originMm:data.min,outlineSizeMm:[data.width,data.depth],...options()};
        dialog.close();afterChange(b.id,planned.length);
      }catch(error){el('gbStatus').textContent=error.message;}
    };
    render();dialog.showModal();
  }
  stepInput.onchange=async()=>{
    const file=stepInput.files[0];stepInput.value='';if(!file||stepBusy)return;
    if(!/\.(step|stp)$/i.test(file.name)){el('gbStatus').textContent='PCB STEP 또는 STP 파일을 선택하세요.';return;}
    const generation=++stepGeneration;let failure='';stepBusy=true;render();
    try{
      const model=await importPCB(file);
      if(generation!==stepGeneration||!dialog.open||getState().project!==project)return;
      const [w,d,thick]=model.size;
      staged={id:'__step__',name:file.name.replace(/\.(step|stp)$/i,''),x:-w/2,y:-d/2,z:0,w,d,thick,rot:0,color:'#1c5e38',opacity:1,modelRole:'pcb',model};
      let option=el('gbTarget').querySelector('option[value="__step__"]');
      if(!option){option=document.createElement('option');option.value='__step__';el('gbTarget').append(option);}
      option.textContent=staged.name+' (선택한 STEP)';el('gbTarget').value='__step__';el('gbAligned').checked=false;
    }catch(error){failure='STEP 가져오기 실패: '+error.message;}
    finally{if(generation===stepGeneration){stepBusy=false;render();if(failure)el('gbStatus').textContent=failure;}}
  };
  input.onchange=async()=>{
    if(reading)return;const files=Array.from(input.files);input.value='';if(!files.length)return;
    reading=true;project=getState().project;
    try{data=await readGerberFiles(files);if(getState().project!==project)throw Error('프로젝트가 변경되었습니다. 다시 가져오세요.');show();}catch(error){alert('거버 가져오기 실패: '+error.message);}finally{reading=false;}
  };
  return ()=>{if(!reading)input.click();};
}
