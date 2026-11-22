import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectDashboard} from '../dashboard-bridge.js';
test('dashboard handoff checks origin, source and nonce; handoff is read-only',async()=>{
 const nonce='00000000-0000-4000-8000-000000000001',sent=[],loaded=[];let listener;
 const parent={closed:false,postMessage:(data,origin)=>sent.push({data,origin})};
 const win={opener:parent,location:{hash:'#dashboard-session='+nonce},crypto:{randomUUID:()=> 'save1'},addEventListener:(name,fn)=>listener=fn,setInterval:()=>1,clearInterval(){},setTimeout:()=>2,clearTimeout(){}};
 const bridge=connectDashboard({win,onLoad:d=>loaded.push(d),onStatus(){}});
 const data={channel:'wirenest-dashboard',nonce,type:'project',text:JSON.stringify({app:'wirenest',v:2,boards:{},nodes:{},wires:{}})};
 listener({source:parent,origin:'https://evil.example',data});listener({source:{},origin:'https://dashboard.3dowon.com',data});listener({source:parent,origin:'https://dashboard.3dowon.com',data:{...data,nonce:'wrong'}});assert.equal(loaded.length,0);
 listener({source:parent,origin:'https://dashboard.3dowon.com',data});listener({source:parent,origin:'https://dashboard.3dowon.com',data});assert.equal(loaded.length,1);
 assert.equal(bridge.save,undefined);assert.ok(sent.every(message=>message.data.type!=='save'));
});
test('ordinary standalone tabs never connect or transmit data',()=>{
 assert.equal(connectDashboard({win:{location:{hash:''},opener:null}}),null);
});
