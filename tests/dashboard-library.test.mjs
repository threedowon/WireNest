import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBackupClient,parseBackup} from '../dashboard-library.js';
test('backup client only accepts the connected window, origin and nonce',async()=>{
 let listener,url;const messages=[];let i=0;const popup={closed:false,postMessage:m=>messages.push(m)};
 const win={crypto:{randomUUID:()=>i++?'request'+i:'00000000-0000-4000-8000-000000000001'},addEventListener:(n,f)=>listener=f,open:u=>(url=u,popup),setTimeout:()=>1,clearTimeout(){}};
 const client=createBackupClient(win),pending=client.list(),nonce='00000000-0000-4000-8000-000000000001';
 const event={source:popup,origin:'https://dashboard.3dowon.com',data:{channel:'wirenest-library',nonce,type:'ready'}};
 listener({...event,origin:'https://evil.example'});await Promise.resolve();assert.equal(messages.length,0);
 listener(event);await Promise.resolve();assert.equal(messages[0].action,'list');assert.match(url,/wirenest-connect.html#session=/);
 const result={...event,data:{channel:'wirenest-library',nonce,id:messages[0].id,documents:[{id:'backup'}]}};
 listener({...result,source:{}});listener({...result,data:{...result.data,nonce:'bad'}});listener(result);
 assert.deepEqual((await pending).documents,[{id:'backup'}]);
 const open=client.open('backup');await Promise.resolve();const request=messages.at(-1);assert.equal(request.action,'open');
 listener({...event,data:{...request,error:'로그인이 필요합니다.'}});await assert.rejects(open,/로그인/);
});
test('blocked popup is reported and invalid projects cannot load',async()=>{
 const win={crypto:{randomUUID:()=> 'id'},addEventListener(){},open:()=>null};
 await assert.rejects(createBackupClient(win).list(),/차단/);
 for(const text of ['{}','null','[]',JSON.stringify({app:'wirenest',v:2,boards:[],nodes:{},wires:{}})])assert.throws(()=>parseBackup(text));
 assert.equal(parseBackup(JSON.stringify({app:'wirenest',v:2,boards:{},nodes:{},wires:{}})).v,2);
});
