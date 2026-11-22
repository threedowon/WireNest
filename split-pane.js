export function attachSplitPane(workspace,divider){
 const key='wirenest.schematicSplit',initial=1.2/2.2;
 let ratio=initial,dragging=false;
 try{const saved=localStorage.getItem(key);if(saved!==null&&Number.isFinite(Number(saved)))ratio=Number(saved);}catch{}
 function apply(value,persist=false){
  ratio=Math.max(.2,Math.min(.8,value));
  workspace.style.setProperty('--schematic-share',ratio);
  workspace.style.setProperty('--scene-share',1-ratio);
  divider.setAttribute('aria-valuenow',String(Math.round(ratio*100)));
  divider.setAttribute('aria-valuetext','회로도 '+Math.round(ratio*100)+'%, 3D '+Math.round((1-ratio)*100)+'%');
  if(persist)try{localStorage.setItem(key,String(ratio));}catch{}
 }
 function move(e){const rect=workspace.getBoundingClientRect(),width=rect.width-divider.offsetWidth;if(width>0)apply((e.clientX-rect.left-divider.offsetWidth/2)/width);}
 function finish(){if(!dragging)return;dragging=false;workspace.classList.remove('resizing-panes');apply(ratio,true);}
 divider.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();dragging=true;divider.focus();divider.setPointerCapture(e.pointerId);workspace.classList.add('resizing-panes');move(e);});
 divider.addEventListener('pointermove',e=>{if(dragging)move(e);});
 divider.addEventListener('pointerup',e=>{finish();if(divider.hasPointerCapture(e.pointerId))divider.releasePointerCapture(e.pointerId);});
 divider.addEventListener('pointercancel',finish);divider.addEventListener('lostpointercapture',finish);
 divider.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();apply(e.key==='Home'?.2:e.key==='End'?.8:ratio+(e.key==='ArrowRight'?1:-1)*(e.shiftKey?.1:.02),true);});
 divider.addEventListener('dblclick',()=>apply(initial,true));apply(ratio);
}
