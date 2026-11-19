import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectDashboard} from '../dashboard-bridge.js';
test('dashboard handoff checks origin, source and nonce; saving waits for an authenticated acknowledgement',async()=>{
 const nonce='00000000-0000-4000-8000-000000000001',sent=[],loaded=[];let listener;
 const parent={closed:false,postMessage:(data,origin)=>sent.push({data,origin})};
 const win={opener:parent,location:{hash:'#dashboard-session='+nonce},crypto:{randomUUID:()=> 'save1'},addEventListener:(name,fn)=>listener=fn,setInterval:()=>1,clearInterval(){},setTimeout:()=>2,clearTimeout(){}};
 const bridge=connectDashboard({win,onLoad:d=>loaded.push(d),onStatus(){}});
 const data={channel:'wirenest-dashboard',nonce,type:'project',text:JSON.stringify({app:'wirenest',v:2,boards:{},nodes:{},wires:{}})};
 listener({source:parent,origin:'https://evil.example',data});listener({source:{},origin:'https://dashboard.3dowon.com',data});listener({source:parent,origin:'https://dashboard.3dowon.com',data:{...data,nonce:'wrong'}});assert.equal(loaded.length,0);
 listener({source:parent,origin:'https://dashboard.3dowon.com',data});listener({source:parent,origin:'https://dashboard.3dowon.com',data});assert.equal(loaded.length,1);
 const saved=bridge.save(data.text);assert.equal(sent.at(-1).data.type,'save');
 listener({source:parent,origin:'https://dashboard.3dowon.com',data:{...data,type:'save-result',requestId:'save1'}});await saved;
 parent.closed=true;await assert.rejects(bridge.save(data.text),/닫혔습니다/);
});
test('ordinary standalone tabs never connect or transmit data',()=>{
 assert.equal(connectDashboard({win:{location:{hash:''},opener:null}}),null);
});
