const origin='https://dashboard.3dowon.com',channel='wirenest-library';
export function createBackupClient(win=window){
 let popup=null,nonce=null,ready=null,resolveReady=null,rejectReady=null,readyTimer;const pending=new Map();
 win.addEventListener('message',event=>{
  const m=event.data;if(event.source!==popup||event.origin!==origin||m?.channel!==channel||m.nonce!==nonce)return;
  if(m.type==='ready'){win.clearTimeout(readyTimer);resolveReady?.();return;}
  const task=pending.get(m.id);if(!task)return;pending.delete(m.id);win.clearTimeout(task.timer);m.error?task.reject(Error(m.error)):task.resolve(m);
 });
 function connect(){
  if(popup&&!popup.closed)return ready;
  nonce=win.crypto.randomUUID();
  ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  popup=win.open(origin+'/wirenest-connect.html#session='+nonce,'_blank','popup,width=480,height=360');
  if(!popup){rejectReady(Error('백업 연결 창이 차단되었습니다. 팝업을 허용하고 다시 눌러주세요.'));return ready;}
  readyTimer=win.setTimeout(()=>rejectReady(Error('연결 시간이 초과되었습니다. 연결 창을 닫고 다시 시도해주세요.')),90000);
  return ready;
 }
 async function call(action,data={}){
  await connect();if(!popup||popup.closed)throw Error('백업 연결 창을 다시 열어주세요.');
  const id=win.crypto.randomUUID();
  return new Promise((resolve,reject)=>{
   pending.set(id,{resolve,reject,timer:win.setTimeout(()=>{pending.delete(id);reject(Error('응답 시간이 초과되었습니다. 백업 목록에서 결과를 확인해주세요.'));},120000)});
   popup.postMessage({channel,nonce,id,action,...data},origin);
  });
 }
 return {list:()=>call('list'),open:documentId=>call('open',{documentId}),save:text=>call('save',{text})};
}
export function parseBackup(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>25*1024*1024)throw Error('25MB 이하의 백업만 열 수 있습니다.');
 const data=JSON.parse(text),record=v=>v&&typeof v==='object'&&!Array.isArray(v);
 if(data?.app!=='wirenest'||!Number.isInteger(data.v)||data.v<1||!['boards','nodes','wires'].every(k=>record(data[k])))throw Error('올바른 WireNest 백업이 아닙니다.');
 return data;
}
export function attachBackupPicker({onLoad,canLoad=()=>true}){
 const client=createBackupClient(),dialog=document.createElement('dialog');dialog.className='backup-dialog';dialog.setAttribute('aria-label','대시보드 백업 불러오기');
 dialog.innerHTML='<h2>대시보드 백업 불러오기</h2><p>백업을 선택하면 현재 WireNest에서 열립니다.</p><div class="backup-tools"><input type="search" aria-label="백업 이름 검색" placeholder="백업 이름 검색"><button type="button" data-refresh>새로고침</button><button type="button" data-close>닫기</button></div><p role="status"></p><div class="backup-list"></div>';
 document.body.append(dialog);dialog.addEventListener('keydown',e=>e.stopPropagation());
 const search=dialog.querySelector('input'),status=dialog.querySelector('[role=status]'),list=dialog.querySelector('.backup-list'),refresh=dialog.querySelector('[data-refresh]');let documents=[],busy=false,generation=0,hasList=false;
 dialog.addEventListener('close',()=>{generation++;busy=false;});
 function render(){
  list.replaceChildren();const shown=documents.filter(d=>d.filename.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
  for(const doc of shown){const row=document.createElement('div');row.className='backup-row';const info=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('small'),button=document.createElement('button');name.textContent=doc.filename;meta.textContent=new Date(doc.createdAt).toLocaleString('ko-KR')+' · '+(doc.size/1024/1024).toFixed(1)+' MB';info.append(name,meta);button.textContent='불러오기';button.disabled=busy;button.onclick=()=>load(doc);row.append(info,button);list.append(row);}
  if(!shown.length&&!busy&&hasList){const empty=document.createElement('p');empty.textContent=documents.length?'검색 결과가 없습니다.':'저장된 백업이 없습니다.';list.append(empty);}
  refresh.disabled=busy;
 }
 async function fetchList(){
  if(busy)return;busy=true;status.textContent='백업 목록을 불러오는 중… 연결 창이 열리면 그대로 두세요.';render();const token=generation;
  try{const result=await client.list();if(token!==generation)return;documents=result.documents||[];hasList=true;window.focus();status.textContent='저장된 백업 '+documents.length+'개';}
  catch(error){if(token===generation)status.textContent=error.message;}
  finally{if(token===generation){busy=false;render();}}
 }
 async function load(doc){
  if(busy||!canLoad())return;const token=generation;busy=true;status.textContent=doc.filename+' 불러오는 중…';render();
  try{const result=await client.open(doc.id);if(token!==generation)return;onLoad(parseBackup(result.text),client);dialog.close();}
  catch(error){if(token===generation)status.textContent=error.message;}
  finally{if(token===generation){busy=false;if(dialog.open)render();}}
 }
 refresh.onclick=fetchList;search.oninput=render;dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 return ()=>{dialog.showModal();fetchList();};
}
