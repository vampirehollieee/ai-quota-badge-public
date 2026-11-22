// Synthetic preview only. Requires Playwright and a local Chrome installation.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'examples/quota-state.json'),'utf8'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:640},colorScheme:'dark'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url()),relative=decodeURIComponent(url.pathname).slice(1);
   if(url.hostname!=='quota-preview.invalid'||relative.includes('..')||relative.includes('\\'))return route.abort();
   const file=path.join(root,relative);
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   await route.fulfill({body:fs.readFileSync(file),contentType:({html:'text/html',js:'text/javascript',css:'text/css',woff2:'font/woff2',png:'image/png',ico:'image/x-icon'})[path.extname(file).slice(1)]||'application/octet-stream'});
  });
  await page.addInitScript(f=>{
   const now=Date.parse(f.now);Date.now=()=>now;
   window.previewState={lastUpdate:now,lastAttempt:now-120000};window.previewListeners=[];
   const budget={};for(const p of ['claude','codex']){previewState[p]={status:'ok',updatedAt:now,rows:[{label:'每週',used:100-f.initialRemaining[p],resetAt:now+f.resetDays[p]*86400000}]};budget[p]={remaining:f.initialRemaining[p]+f.todayUsed};}
   window.chrome={i18n:{getUILanguage:()=> 'zh-TW'},runtime:{sendMessage:async()=>({state:previewState})},storage:{local:{get:async()=>({popupTheme:'dark',resetLog:{events:[]},dailyBudget:budget}),set:async()=>{}},onChanged:{addListener(fn){previewListeners.push(fn)}}}};
  },fixture);
  await page.goto('http://quota-preview.invalid/dock.html');
  await page.locator('.value').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const label=document.createElement('div');label.textContent='SYNTHETIC DATA / 合成資料 · 2030-01-01';label.style.cssText='position:fixed;top:2px;left:24px;font:10px sans-serif;color:#aaa;z-index:100;pointer-events:none';document.body.append(label);});
  await page.screenshot({path:path.join(root,'docs/screenshots/wide.png')});
  await page.setViewportSize({width:1200,height:160});
  for(const remaining of fixture.remainingPercentages){
   await page.evaluate(n=>{const budget={};for(const p of ['claude','codex']){previewState[p].rows[0].used=100-n;budget[p]={remaining:Math.min(100,n+4)};}for(const listener of previewListeners)listener({quotaState:{newValue:previewState},dailyBudget:{newValue:budget}},'local');},remaining);
   await page.waitForFunction(n=>[...document.querySelectorAll('.strip-value')].every(el=>el.textContent==='剩 '+n+'%'),remaining);
   const fills=await page.locator('.strip-meter').evaluateAll(es=>es.map(e=>[...e.querySelectorAll(':scope > span')].map(c=>parseFloat(c.style.getPropertyValue('--cell-fill')))));
   const expected=Array.from({length:10},(_,i)=>Math.max(0,Math.min(100,(remaining-i*10)*10)));
   fills.forEach(actual=>assert.deepEqual(actual,expected));
   await page.screenshot({path:path.join(root,'docs/screenshots/remaining-'+remaining+'.png')});
  }
  assert.deepEqual(errors,[]);console.log('Created 5 synthetic screenshots; both providers and all four fractional fills verified.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
