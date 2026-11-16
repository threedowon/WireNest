// NODE_PATH must contain playwright; start a server and set WIRENEST_URL if needed.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const base=process.env.WIRENEST_URL||'http://127.0.0.1:8765/';
    await page.goto(base+'?example=housing');
    await page.waitForFunction(()=>document.getElementById('home').hidden);
    await page.locator('#filemenu').click();await page.locator('[data-a="new"]').click();
    assert(await page.locator('#home-name').isVisible());
    await page.locator('#home-name').fill('새 프로젝트 검증');
    await page.locator('#home-create').click();
    assert.equal(await page.locator('#projname').innerText(),'새 프로젝트 검증');
    assert.equal(await page.locator('.orow').count(),0);
    assert.equal(new URL(page.url()).search,'');
    await page.locator('#filemenu').click();await page.locator('[data-a="home"]').click();
    assert.equal(await page.locator('#home-newform').isVisible(),false);
    await page.locator('#home-new').click();await page.locator('#home-name').fill('Enter 생성');
    await page.locator('#home-name').press('Enter');
    assert.equal(await page.locator('#projname').innerText(),'Enter 생성');
    assert.equal(await page.locator('#home').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: file menu creation, empty scene, demo URL cleared, hidden form, home creation with Enter, no runtime errors');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
