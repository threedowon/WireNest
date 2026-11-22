// Connector diagram uses the same node and wire IDs as the 3D editor.
export function schematicCards(state){
 const groups=new Map();
 for(const node of Object.values(state.nodes)){
  const board=state.boards[node.board];if(board?.modelRole==='housing')continue;
  const connector=node.gerber?.reference||'패드';
  const key=JSON.stringify([node.board||'',connector]);
  if(!groups.has(key))groups.set(key,{key,boardId:board?.id,title:board?.name||'독립 연결점',connector,nodes:[]});
  groups.get(key).nodes.push(node);
 }
 const cards=[...groups.values()].sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true})||a.connector.localeCompare(b.connector,undefined,{numeric:true}));
 const ys=[36,36];
 cards.forEach((card,i)=>{
  card.nodes.sort((a,b)=>(a.gerber?.pin||a.name||'').localeCompare(b.gerber?.pin||b.name||'',undefined,{numeric:true})||(a.face||'').localeCompare(b.face||''));
  card.w=246;card.h=64+card.nodes.length*30;const col=i%2;
  const saved=state.schematicLayout?.[card.key];
  card.x=Number.isFinite(saved?.x)?saved.x:40+col*370;card.y=Number.isFinite(saved?.y)?saved.y:ys[col];ys[col]+=card.h+48;
 });return cards;
}
export function schematicGeometry(state){
 const cards=schematicCards(state),ports=new Map();
 for(const c of cards)c.nodes.forEach((n,i)=>ports.set(n.id,{x:c.x,y:c.y+72+i*30,right:c.x+c.w,card:c.key}));
 return {cards,ports};
}
export function wirePath(a,b,index=0){
 if(a.card===b.card){const x=a.right+30+(index%7)*8;return `M ${a.right} ${a.y} H ${x} V ${b.y} H ${b.right}`;}
 const left=a.x<=b.x?a:b,right=a.x<=b.x?b:a;
 if(left.right+20<right.x){const x=(left.right+right.x)/2+(index%7-3)*6;return `M ${left.right} ${left.y} H ${x} V ${right.y} H ${right.x}`;}
 const x=Math.max(a.right,b.right)+30+(index%7)*8;return `M ${a.right} ${a.y} H ${x} V ${b.y} H ${b.right}`;
}
const NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs={},text){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el;}
export function attachSchematic({host,getState,select,connect,remove,undo,beforeChange,changed,onMode}){
 let mode='3d',tool='connect',start=null,view={x:0,y:0,k:1},geometry,drag=null,lastProject=null,active=false;
 host.innerHTML='<div class="schematic-head"><div><b>배선 회로도</b><small>핀 두 개를 클릭해 연결 · 카드 제목을 끌어 배치</small></div><span class="sync-badge">● 3D 동기화</span></div><div class="schematic-tools"><button data-tool="select">선택</button><button data-tool="connect" class="on">연결</button><button data-action="undo" title="Ctrl+Z">↶</button><input type="search" placeholder="검색 후 Enter로 이동" aria-label="회로도 검색"><button data-action="minus" aria-label="회로도 축소">−</button><span data-zoom>100%</span><button data-action="plus" aria-label="회로도 확대">＋</button><button data-action="fit">맞춤</button></div><svg class="schematic-canvas" tabindex="0" aria-label="편집 가능한 배선 회로도"></svg><div class="schematic-footer"><span role="status"></span><button data-action="cancel" hidden>연결 취소</button><button data-action="delete" hidden>선택 선 삭제</button></div>';
 const svg=host.querySelector('svg'),status=host.querySelector('[role=status]'),search=host.querySelector('input');
 const viewport=svgEl('g');svg.append(viewport);
 function transform(){viewport.setAttribute('transform',`translate(${view.x} ${view.y}) scale(${view.k})`);host.querySelector('[data-zoom]').textContent=Math.round(view.k*100)+'%';}
 function zoom(factor){const r=svg.getBoundingClientRect(),k=Math.max(.12,Math.min(3,view.k*factor));view.x=r.width/2-(r.width/2-view.x)*k/view.k;view.y=r.height/2-(r.height/2-view.y)*k/view.k;view.k=k;transform();}
 function fit(){if(!geometry?.cards.length)return;const r=svg.getBoundingClientRect();const minX=Math.min(...geometry.cards.map(c=>c.x))-30,minY=Math.min(...geometry.cards.map(c=>c.y))-25,maxX=Math.max(...geometry.cards.map(c=>c.x+c.w))+90,maxY=Math.max(...geometry.cards.map(c=>c.y+c.h))+25;view.k=Math.max(.12,Math.min(1.2,r.width/(maxX-minX),r.height/(maxY-minY)));view.x=(r.width-(maxX-minX)*view.k)/2-minX*view.k;view.y=(r.height-(maxY-minY)*view.k)/2-minY*view.k;transform();}
 function render(){
  if(mode==='3d')return;const s=getState();if(lastProject!==s.project){start=null;lastProject=s.project;active=false;view={x:0,y:0,k:1};}
  if(start&&!s.nodes[start])start=null;geometry=schematicGeometry(s);viewport.replaceChildren();
  const selected=(type,id)=>s.selList.some(v=>v.t===type&&v.id===id),query=search.value.trim().toLowerCase();
  for(const c of geometry.cards){
   const g=svgEl('g',{'data-card':c.key});const isMatch=!query||[c.title,c.connector,...c.nodes.map(n=>n.name)].join(' ').toLowerCase().includes(query);
   g.classList.add('schematic-card');if(!isMatch)g.classList.add('dim');
   g.append(svgEl('rect',{x:c.x,y:c.y,width:c.w,height:c.h,rx:10,class:selected('board',c.boardId)?'card-bg selected':'card-bg'}));
   const header=svgEl('g',{'data-drag':c.key,class:'card-header'});
   header.append(svgEl('rect',{x:c.x,y:c.y,width:c.w,height:47,rx:10,class:'card-title-bg'}),svgEl('text',{x:c.x+12,y:c.y+20,class:'card-title'},c.title.length>26?c.title.slice(0,25)+'…':c.title),svgEl('text',{x:c.x+12,y:c.y+38,class:'card-subtitle'},c.connector+' · '+c.nodes.length+'핀'));g.append(header);
   for(const n of c.nodes){const p=geometry.ports.get(n.id),row=svgEl('g',{'data-node':n.id,role:'button',tabindex:'0','aria-label':c.title+' '+(n.name||n.id),class:'pin-row'+(start===n.id||selected('node',n.id)?' selected':'')});
    row.append(svgEl('title',{},(n.name||n.id)+' · '+(n.face==='bottom'?'뒷면':'앞면')),svgEl('rect',{x:c.x-9,y:p.y-14,width:c.w+18,height:28,rx:5,class:'pin-hit'}));
    const net=s.nets[n.netId],label=n.gerber?(n.gerber.pin+' / '+(n.gerber.net||n.gerber.pinFunction||'')):(n.name||'패드');
    row.append(svgEl('text',{x:c.x+15,y:p.y+4,class:'pin-label'},label.length>25?label.slice(0,24)+'…':label),svgEl('text',{x:c.x+c.w-14,y:p.y+4,'text-anchor':'end',class:'pin-face'},n.face==='bottom'?'B':'F'));
    for(const x of [p.x,p.right])row.append(svgEl('circle',{cx:x,cy:p.y,r:5.5,fill:net?.color||'#8496a2',class:'pin-dot'}));g.append(row);
   }viewport.append(g);
  }
  // Wires are drawn over cards with a wide transparent hit target.
  Object.values(s.wires).forEach((w,i)=>{const a=geometry.ports.get(w.a),b=geometry.ports.get(w.b);if(!a||!b)return;const d=wirePath(a,b,i),g=svgEl('g',{'data-wire':w.id,role:'button',tabindex:'0','aria-label':'배선 '+(s.nodes[w.a]?.name||w.a)+' → '+(s.nodes[w.b]?.name||w.b)}),col=w.color||s.nets[w.netId]?.color||'#788998';g.append(svgEl('path',{d,class:'wire-halo',stroke:selected('wire',w.id)?'#0d99ff':'var(--panel)', 'stroke-width':selected('wire',w.id)?8:5}),svgEl('path',{d,stroke:col,'stroke-width':2.5,class:'wire-line'}),svgEl('path',{d,class:'wire-hit'}));viewport.append(g);});
  // Terminal hit areas remain accessible above the wires.
  for(const [id,p] of geometry.ports)for(const x of [p.x,p.right])viewport.append(svgEl('circle',{cx:x,cy:p.y,r:10,'data-node':id,class:'terminal-hit'}));
  const w=s.sel?.t==='wire'?s.wires[s.sel.id]:null;const endpoint=id=>{const n=s.nodes[id];return (s.boards[n?.board]?.name||'독립')+' · '+(n?.name||'?');};
  status.textContent=start?'시작: '+(s.nodes[start]?.name||'핀')+' → 연결할 핀을 선택하세요.':w?endpoint(w.a)+' ↔ '+endpoint(w.b)+' · '+(s.nets[w.netId]?.name||'네트 없음')+' · '+w.awg+' AWG':geometry.cards.length?Object.keys(s.wires).length+'개 배선 · 빈 공간 드래그로 이동 · 휠로 확대':'패드를 가져오거나 3D에서 패드를 추가하세요.';
  host.querySelector('[data-action=cancel]').hidden=!start;host.querySelector('[data-action=delete]').hidden=!w;transform();
 }
 function pin(id){const s=getState();if(!s.nodes[id])return;if(tool==='select'){select('node',id);return;}if(!start){start=id;select('node',id);render();return;}if(start===id){start=null;render();return;}const a=start;start=null;connect(a,id);render();}
 function activate(target){active=true;const node=target.closest('[data-node]'),wire=target.closest('[data-wire]');if(node)pin(node.dataset.node);else if(wire){start=null;select('wire',wire.dataset.wire);}}
 svg.addEventListener('click',e=>{if(drag?.moved)return;activate(e.target);});
 svg.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(e.target);}if(e.key==='Escape'){e.stopPropagation();start=null;render();}if(e.key==='f'){e.stopPropagation();fit();}});
 svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;active=true;const header=e.target.closest('[data-drag]');if(!header&&e.target.closest('[data-node],[data-wire]'))return;const c=header&&geometry.cards.find(c=>c.key===header.dataset.drag);drag={x:e.clientX,y:e.clientY,ox:c?.x??view.x,oy:c?.y??view.y,key:c?.key,board:c?.boardId,moved:false};svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{if(!drag||!svg.hasPointerCapture(e.pointerId))return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;if(!drag.moved&&drag.key)beforeChange();drag.moved=true;if(drag.key){const s=getState();s.schematicLayout??={};s.schematicLayout[drag.key]={x:drag.ox+dx/view.k,y:drag.oy+dy/view.k};render();}else{view.x=drag.ox+dx;view.y=drag.oy+dy;transform();}});
 svg.addEventListener('pointerup',e=>{if(!drag)return;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(drag.moved&&drag.key)changed();else if(!drag.moved&&drag.board)select('board',drag.board);setTimeout(()=>{drag=null;},0);});
 svg.addEventListener('pointercancel',()=>{if(drag?.moved&&drag.key)changed();drag=null;});
 svg.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
 host.addEventListener('click',e=>{const t=e.target.closest('[data-tool]');if(t){tool=t.dataset.tool;start=null;host.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('on',b===t));render();}const a=e.target.closest('[data-action]')?.dataset.action;if(a==='fit')fit();if(a==='plus')zoom(1.2);if(a==='minus')zoom(1/1.2);if(a==='cancel'){start=null;render();}if(a==='delete')remove();if(a==='undo')undo();});
 search.addEventListener('input',render);search.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=search.value.toLowerCase(),c=geometry.cards.find(c=>[c.title,c.connector,...c.nodes.map(n=>n.name)].join(' ').toLowerCase().includes(q));if(c){view.k=1;view.x=svg.clientWidth/2-c.x-c.w/2;view.y=30-c.y;transform();}}});
 return {render,fit,setMode(next){mode=next;start=null;host.hidden=mode==='3d';onMode(mode);render();if(!active&&mode!=='3d')requestAnimationFrame(()=>{view.k=Math.min(1,Math.max(.5,svg.clientWidth/760));view.x=8;view.y=8;transform();});},getMode:()=>mode};
}
