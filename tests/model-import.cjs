// Run with NODE_PATH pointing to a directory containing playwright, three and occt-import-js.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);
  try{
    let body=fs.readFileSync(file);
    if(file.endsWith('index.html'))body=body.toString().replace('function init(){','window.testState=S;window.testAPI={serialize,loadData,undo,redo,padData,addPadAt,addWire,select};function init(){');
    res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'text/javascript');res.end(body);
  }catch{res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{}),headless:true});
  try{
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://unpkg.com/three@0.160.0/**',route=>{
      const rel=route.request().url().split('three@0.160.0/')[1];
      return route.fulfill({path:path.join(path.dirname(require.resolve('three')),'..',rel),contentType:'text/javascript'});
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#home-sample').click();
    const stl='solid sample\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 40 0 0\nvertex 0 30 2\nendloop\nendfacet\nendsolid sample';
    async function upload(name,buffer,role){
      await page.locator('#filemenu').click();await page.locator(`[data-a="${role}"]`).click();
      await page.locator('#modelfile').setInputFiles({name,mimeType:'application/octet-stream',buffer});
      await page.waitForFunction(name=>Object.values(testState.boards).some(b=>b.name===name),name.replace(/\.[^.]+$/,''));
    }
    await upload('housing.stl',Buffer.from(stl),'housing');
    assert.deepEqual(await page.evaluate(()=>{const b=Object.values(testState.boards).find(b=>b.model);return[b.w,b.d,b.thick,b.opacity];}),[40,30,2,.25]);
    const binary=Buffer.alloc(134);binary.writeUInt32LE(1,80);[0,0,0,20,0,0,0,10,1].forEach((v,i)=>binary.writeFloatLE(v,96+i*4));
    await upload('pcb.stl',binary,'pcb');
    await page.evaluate(()=>{
      const b=Object.values(testState.boards).find(b=>b.name==='pcb');
      testAPI.addPadAt(b,{x:b.x+2,y:.4,z:b.y+3});
      const a=testState.sel.id;testAPI.addPadAt(b,{x:b.x+8,y:.7,z:b.y+4});
      testAPI.addWire(a,testState.sel.id);
      const p=testAPI.padData(testState.nodes[a]);if(Math.abs(p[2]-.4)>1e-6)throw Error('surface height');
      b.z=12;if(Math.abs(testAPI.padData(testState.nodes[a])[2]-12.4)>1e-6)throw Error('attached pad movement');
      const saved=JSON.stringify(testAPI.serialize());testAPI.loadData(JSON.parse(saved));
      if(JSON.stringify(testAPI.serialize())!==saved)throw Error('round trip');
    });
    // Actual STEP worker/CDN conversion, not a mocked importer.
    const fixture=process.env.STEP_FIXTURE;
    if(!fixture)throw Error('Set STEP_FIXTURE to the OCCT cube.stp fixture.');
    await upload('cube.step',fs.readFileSync(fixture),'pcb');
    await page.evaluate(()=>{testAPI.undo();if(Object.values(testState.boards).some(b=>b.name==='cube'))throw Error('undo');testAPI.redo();if(!Object.values(testState.boards).some(b=>b.name==='cube'))throw Error('redo');});
    await page.evaluate(()=>{const saved=JSON.stringify(testAPI.serialize());testAPI.loadData(JSON.parse(saved));if(JSON.stringify(testAPI.serialize())!==saved)throw Error('STEP round trip');});
    const before=await page.evaluate(()=>Object.keys(testState.boards).length);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#modelfile').setInputFiles({name:'bad.step',mimeType:'application/octet-stream',buffer:Buffer.from('invalid STEP')});
    await page.waitForFunction(()=>!document.getElementById('projname').hasAttribute('aria-busy'));
    assert.equal(await page.evaluate(()=>Object.keys(testState.boards).length),before);
    assert.deepEqual(errors,[]);
    console.log('PASS: ASCII/binary STL, STEP worker conversion, surface pins, attached movement, wire creation, JSON round trip, undo/redo');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
