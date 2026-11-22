const channel='wirenest-dashboard',origin='https://dashboard.3dowon.com',limit=25*1024*1024;
export function connectDashboard({win=window,onLoad,onStatus}){
  const nonce=new URLSearchParams(win.location.hash.slice(1)).get('dashboard-session'),parent=win.opener;
  if(!parent||!nonce||!/^[a-f0-9-]{36}$/i.test(nonce))return null;
  let loaded=false,consumed=false;
  const send=data=>parent.postMessage({channel,nonce,...data},origin);
  const receive=event=>{
    const m=event.data;if(event.source!==parent||event.origin!==origin||m?.channel!==channel||m.nonce!==nonce)return;
    if(m.type==='project'&&!consumed){
      consumed=true;win.clearInterval(timer);
      try{
        if(typeof m.text!=='string'||new TextEncoder().encode(m.text).length>limit)throw Error('25MB 이하의 백업만 열 수 있습니다.');
        const data=JSON.parse(m.text),record=v=>v&&typeof v==='object'&&!Array.isArray(v);
        if(data?.app!=='wirenest'||!Number.isInteger(data.v)||data.v<1||!['boards','nodes','wires'].every(k=>record(data[k])))throw Error('올바른 WireNest 백업이 아닙니다.');
        onLoad(data);loaded=true;send({type:'loaded'});onStatus('대시보드 백업을 열었습니다. Ctrl+S로 내 컴퓨터에 파일로 저장하세요.');
      }catch(error){onStatus('백업 열기 실패: '+error.message);}
    }
    if(m.type==='error'){win.clearInterval(timer);onStatus(m.error||'대시보드 연결에 실패했습니다.');}
  };
  win.addEventListener('message',receive);
  let tries=0;
  const timer=win.setInterval(()=>{if(++tries>90||parent.closed){win.clearInterval(timer);if(!loaded)onStatus('대시보드 연결이 끊겼습니다. 백업 목록에서 다시 열어주세요.');return;}send({type:'ready'});},1000);
  send({type:'ready'});
  return {};
}
