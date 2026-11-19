const channel='wirenest-dashboard',origin='https://dashboard.3dowon.com',limit=25*1024*1024;
export function connectDashboard({win=window,onLoad,onStatus}){
  const nonce=new URLSearchParams(win.location.hash.slice(1)).get('dashboard-session'),parent=win.opener;
  if(!parent||!nonce||!/^[a-f0-9-]{36}$/i.test(nonce))return null;
  let loaded=false,consumed=false,pending=null;
  const send=data=>parent.postMessage({channel,nonce,...data},origin);
  const receive=event=>{
    const m=event.data;if(event.source!==parent||event.origin!==origin||m?.channel!==channel||m.nonce!==nonce)return;
    if(m.type==='project'&&!consumed){
      consumed=true;win.clearInterval(timer);
      try{
        if(typeof m.text!=='string'||new TextEncoder().encode(m.text).length>limit)throw Error('25MB 이하의 백업만 열 수 있습니다.');
        const data=JSON.parse(m.text),record=v=>v&&typeof v==='object'&&!Array.isArray(v);
        if(data?.app!=='wirenest'||!Number.isInteger(data.v)||data.v<1||!['boards','nodes','wires'].every(k=>record(data[k])))throw Error('올바른 WireNest 백업이 아닙니다.');
        onLoad(data);loaded=true;send({type:'loaded'});onStatus('대시보드 백업을 열었습니다. Ctrl+S 또는 대시보드에 백업으로 저장하세요.');
      }catch(error){onStatus('백업 열기 실패: '+error.message);}
    }
    if(m.type==='error'){win.clearInterval(timer);onStatus(m.error||'대시보드 연결에 실패했습니다.');}
    if(m.type==='save-result'&&pending&&m.requestId===pending.id){const p=pending;pending=null;win.clearTimeout(p.timeout);m.error?p.reject(Error(m.error)):p.resolve();}
  };
  win.addEventListener('message',receive);
  let tries=0;
  const timer=win.setInterval(()=>{if(++tries>90||parent.closed){win.clearInterval(timer);if(!loaded)onStatus('대시보드 연결이 끊겼습니다. 백업 목록에서 다시 열어주세요.');return;}send({type:'ready'});},1000);
  send({type:'ready'});
  return {save(text){
    if(!loaded||parent.closed)return Promise.reject(Error('대시보드 탭이 닫혔습니다. 파일로 저장하거나 대시보드에서 다시 열어주세요.'));
    if(pending)return pending.promise;
    if(new TextEncoder().encode(text).length>limit)return Promise.reject(Error('25MB 이하의 프로젝트만 백업할 수 있습니다.'));
    const id=win.crypto.randomUUID();let resolve,reject;
    const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    pending={id,promise,resolve,reject,timeout:win.setTimeout(()=>{pending=null;reject(Error('백업 응답 시간이 초과되었습니다. 대시보드 목록에서 저장 여부를 확인하세요.'));},120000)};
    try{send({type:'save',requestId:id,text});}catch(error){win.clearTimeout(pending.timeout);pending=null;reject(error);}
    return promise;
  }};
}
