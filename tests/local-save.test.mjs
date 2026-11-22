import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('async function saveProject()'),html.indexOf('function exportImage()'));
test('dashboard-origin projects save over 25MB locally, reopen intact and reuse the chosen file',async()=>{
 const data={app:'wirenest',v:2,name:'large',boards:{pcb:{img:'data:image/png;base64,'+'a'.repeat(26*1024*1024),model:{vertices:[1,2,3]}}},nodes:{pad:{id:'pad',board:'pcb'}},wires:{wire:{a:'pad',b:'other'}}};
 let saved,picks=0,writes=0,opened;
 const handle={name:'large.wnest',createWritable:async()=>({write:async text=>{saved=text;writes++;},close:async()=>{}}),getFile:async()=>({name:'large.wnest',text:async()=>saved})};
 const context=vm.createContext({S:{project:{name:'large',dashboardBackup:true,fileHandle:null,dirty:true}},hasFS:true,serialize:()=>data,showSaveFilePicker:async()=>{picks++;return handle;},showOpenFilePicker:async()=>[handle],baseName:s=>s.replace(/\.wnest$/,''),updateProjName(){},toast(){},alert:message=>assert.fail(message),unwrapProject:d=>d,loadData:d=>{opened=d;},hideHome(){}});
 vm.runInContext(code,context);
 await context.saveProject();assert.equal(picks,1);assert.ok(saved.length>25*1024*1024);assert.equal(context.S.project.dirty,false);
 await context.saveProject();assert.equal(picks,1);assert.equal(writes,2);
 await context.openProject();assert.ok(JSON.stringify(opened)===JSON.stringify(data));
 await context.saveProjectAs();assert.equal(picks,2);
});
test('browsers without a file picker download a standalone project file',async()=>{
 let result;const data={boards:{},nodes:{},wires:{}};
 const context=vm.createContext({S:{project:{name:'local',dashboardBackup:true}},hasFS:false,serialize:()=>data,downloadJSON:(d,name)=>{result={d,name};},toast(){},alert:message=>assert.fail(message)});
 vm.runInContext(code,context);await context.saveProject();assert.deepEqual(result,{d:data,name:'local.wnest'});
});
