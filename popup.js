import {budgetView} from './daily-budget.js';
import {resetLabel} from './quota.js';
import {pixelCount} from './presentation.js';
import {errorMessage} from './service.js';
let state={},busy=false,dailyBudget={},lastRender='';
try{dailyBudget=(await chrome.storage.local.get('dailyBudget')).dailyBudget??{};}catch{}
const button=document.querySelector('#refresh');
const status=document.querySelector('#status');
function node(tag,className,text) {const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
function render() {
  const seconds=Math.max(0,Math.ceil(((state.lastAttempt??0)+60000-Date.now())/1000));
  button.disabled=busy||seconds>0;button.textContent='更新';
  const signature=JSON.stringify([state,dailyBudget,Math.floor(Date.now()/60000)]);
  if(signature===lastRender)return;lastRender=signature;
  for(const provider of ['claude','codex']) {
    const section=document.querySelector(`#${provider}`),data=state[provider];
    const stale=typeof data?.updatedAt==='number' && Date.now()-data.updatedAt>600000;
    const heading=node('h2','',provider==='claude'?'Claude':'Codex');section.replaceChildren(heading);
    if(data?.status==='error') {
      section.append(node('p','error',errorMessage(provider,data.error)));
      if(data.paused) section.append(node('p','note',data.failures===1 && ['http-401','http-403'].includes(data.error)?'自動更新已暫停。登入後可按下方按鈕重試一次。':'此來源已停止更新，請回報錯誤；另一邊照常更新。'));
    }
    const rows=(data?.status==='ok'?data.rows:[{label:'每週',used:null,resetAt:null}]).filter(row=>row.label==='每週');
    for(const row of rows) {
      const block=node('div','quota'),top=node('div','row');block.dataset.stale=String(stale);
      const remaining=row.used===null?null:Number((100-row.used).toFixed(2));
      const value=node('span','value',remaining===null?'剩 —':`剩 ${remaining}%${stale?' · 舊':''}`);value.append(node('small','',row.used===null?'':`${row.used}% 已用`));
      top.append(value);
      const progress=node('div',`pixel-meter${remaining===null?' unknown':''}`);
      progress.setAttribute('role','progressbar');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');
      if(remaining!==null) progress.setAttribute('aria-valuenow',String(remaining));
      progress.setAttribute('aria-label',`${row.label} 剩餘 ${remaining??'未知'}%`);
      progress.dataset.level=remaining===null?'unknown':remaining<10?'danger':remaining<=30?'warning':'normal';
      for(let i=0;i<20;i++){const cell=node('span',i<pixelCount(remaining)?'lit':'');cell.setAttribute('aria-hidden','true');progress.append(cell);}
      if(remaining!==null && remaining<10) value.classList.add('critical');
      const budget=budgetView(dailyBudget[provider],row,provider);
      const note=node('p','daily-budget'+(budget?.over?' over-budget':''),budget?`今天用了 ${budget.used}%／今天建議 ≤ ${budget.available}%`:'今天用了 —／今天建議 ≤ —');
      if(budget){const tick=node('i','budget-tick'+(budget.over?' over-budget':''));tick.style.left=`${budget.tick}%`;tick.setAttribute('aria-hidden','true');progress.append(tick);}
      block.append(node('p','label',row.label),top,progress,node('p','reset',resetLabel(row)),note);
      section.append(block);
    }
    if(stale) section.append(node('p','note','資料已超過 10 分鐘，等待更新。'));
  }
  document.querySelector('#updated').textContent=`上次更新 ${state.lastUpdate?new Date(state.lastUpdate).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false}):'—'}`;
}
async function send(type) {
  try {const result=await chrome.runtime.sendMessage({type});if(result?.error)throw new Error(result.error);state=result?.state??{};}
  catch {status.textContent='無法連線背景程式，請在擴充功能管理頁重新載入。';}
}
button.addEventListener('click',async()=>{busy=true;render();await send('refresh');busy=false;render();});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'){if(changes.quotaState)state=changes.quotaState.newValue??{};if(changes.dailyBudget)dailyBudget=changes.dailyBudget.newValue??{};if(changes.quotaState||changes.dailyBudget)render();}});
await send('get-state');render();
setInterval(render,1000);
