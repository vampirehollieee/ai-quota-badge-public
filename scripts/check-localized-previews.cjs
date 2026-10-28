// Synthetic browser checks only: all requests are intercepted and served locally.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  for(const language of ['en-US','zh-CN']){
   const context=await browser.newContext({viewport:{width:640,height:500},locale:language,timezoneId:'America/Los_Angeles',colorScheme:'dark'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url()),relative=decodeURIComponent(url.pathname).slice(1);
    if(url.hostname!=='quota-preview.invalid'||relative.includes('..')||relative.includes('\\'))return route.abort();
    const file=path.join(root,relative);
    if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
    await route.fulfill({body:fs.readFileSync(file),contentType:({html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',woff2:'font/woff2'})[path.extname(file).slice(1)]||'application/octet-stream'});
   });
   await page.addInitScript(language=>{
    const now=Date.parse('2030-01-01T08:00:00Z');Date.now=()=>now;
    const organizations=[{id:'synthetic-a',name:'Synthetic Personal'},{id:'synthetic-b',name:'Synthetic Team'}];
    let selectedId=organizations[0].id;
    const state={lastUpdate:now,lastAttempt:now-120000,claude:{status:'ok',updatedAt:now,rows:[{label:'每週',used:56,resetAt:now+3*86400000}]},codex:{status:'ok',updatedAt:now,rows:[{label:'每週',used:10,resetAt:now+6*86400000}]}};
    const store={quotaState:state,popupTheme:'dark',dailyBudget:{claude:{remaining:48},codex:{remaining:94}},resetLog:{events:[{kind:'每週',provider:'claude',detectedAt:now-60000,observedAt:now-120000,remaining:12,early:true,scheduledAt:now+3600000}]}};
    window.synthetic={organizations,store,messages:[],slow:location.search.includes('slow')};
    window.chrome={i18n:{getUILanguage:()=>language},runtime:{sendMessage:async message=>{
     synthetic.messages.push(message);
     if(synthetic.slow&&message.type==='get-state')await new Promise(()=>{});
     if(message.type==='select-organization'){selectedId=message.id;store.claudeOrganizationId=selectedId;}
     return {state,organizations,selectedId};
    }},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,store[k]])),set:async changes=>Object.assign(store,changes)},onChanged:{addListener(){}}}};
   },language);
   await page.goto('http://quota-preview.invalid/popup.html');
   await page.locator('#claude-organization option').nth(1).waitFor({state:'attached'});
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('#claude-organization').inputValue(),'synthetic-a');
   await page.locator('#claude-organization').selectOption('synthetic-b');
   await page.waitForFunction(()=>synthetic.store.claudeOrganizationId==='synthetic-b');
   await page.locator('#claude').click();
   assert.equal(await page.locator('#updated').textContent(),language==='en-US'?'Updated 00:00':'上次更新 00:00');
   const resetText=await page.locator('#claude .reset').textContent();assert(resetText.includes('00:00'),resetText);
   assert((await page.locator('#reset-events').textContent()).includes('23:59'));
   if(language==='en-US')assert(!/\p{Script=Han}/u.test(await page.locator('body').innerText()));
   else assert.equal(await page.locator('h1').textContent(),'AI 額度');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,'horizontal overflow');
   await page.evaluate(()=>{const label=document.createElement('p');label.textContent='SYNTHETIC DATA · 2030-01-01 · America/Los_Angeles';label.style.cssText='font:10px sans-serif;color:#aaa;margin:14px 0 0';document.body.append(label);});
   await page.screenshot({path:path.join(root,'docs/screenshots',language==='en-US'?'english-popup.png':'organizations-zh.png'),fullPage:true});
   // One organization hides the control on the next state response.
   await page.evaluate(()=>synthetic.organizations.splice(1));await page.locator('#refresh').click();
   await page.waitForFunction(()=>document.querySelector('#organization-control').hidden);
   // A stalled background request must not prevent cached data or popup layout from rendering.
   await page.goto('http://quota-preview.invalid/popup.html?slow=1');await page.locator('.value').first().waitFor();
   await page.waitForFunction(()=>!!document.querySelector('.header-actions #refresh'));
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: en/zh-CN UI, local dates across midnight, synthetic multi-org selection, single-org hiding, cached UI during stalled discovery, no horizontal overflow.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
