import {t,localTime,quotaLabel} from './i18n.js';
import {budgetView} from './daily-budget.js';
import {resetLabel} from './quota.js';
import {pixelCount} from './presentation.js';
import {errorMessage} from './service.js';
let state={},busy=false,dailyBudget={},lastRender='';
try{const saved=await chrome.storage.local.get(['dailyBudget','quotaState']);dailyBudget=saved.dailyBudget??{};state=saved.quotaState??{};}catch{}
const button=document.querySelector('#refresh');
const status=document.querySelector('#status');
function node(tag,className,text) {const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
function render() {
  const seconds=Math.max(0,Math.ceil(((state.lastAttempt??0)+60000-Date.now())/1000));
  button.disabled=busy||seconds>0;button.textContent=t('refresh');
  const signature=JSON.stringify([state,dailyBudget,Math.floor(Date.now()/60000)]);
  if(signature===lastRender)return;lastRender=signature;
  for(const provider of ['claude','codex']) {
    const section=document.querySelector(`#${provider}`),data=state[provider];
    const stale=typeof data?.updatedAt==='number' && Date.now()-data.updatedAt>600000;
    const heading=node('h2','',provider==='claude'?'Claude':'Codex');section.replaceChildren(heading);
    if(data?.status==='error') {
      section.append(node('p','error',errorMessage(provider,data.error)));
      if(data.paused) section.append(node('p','note',data.failures===1 && ['http-401','http-403'].includes(data.error)?t('pausedLogin'):t('pausedError')));
    }
    const rows=(data?.status==='ok'?data.rows:[{label:'每週',used:null,resetAt:null}]).filter(row=>row.label==='每週');
    for(const row of rows) {
      const block=node('div','quota'),top=node('div','row');block.dataset.stale=String(stale);
      const remaining=row.used===null?null:Number((100-row.used).toFixed(2));
      const value=node('span','value',remaining===null?t('remainingUnknown'):t('remaining',remaining)+(stale?t('staleMark'):''));value.append(node('small','',row.used===null?'':t('used',row.used)));
      top.append(value);
      const progress=node('div',`pixel-meter${remaining===null?' unknown':''}`);
      progress.setAttribute('role','progressbar');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');
      if(remaining!==null) progress.setAttribute('aria-valuenow',String(remaining));
      progress.setAttribute('aria-label',t('quotaAria',quotaLabel(row.label),remaining??t('unknown')));
      progress.dataset.level=remaining===null?'unknown':remaining<10?'danger':remaining<=30?'warning':'normal';
      for(let i=0;i<20;i++){const cell=node('span',i<pixelCount(remaining)?'lit':'');cell.setAttribute('aria-hidden','true');progress.append(cell);}
      if(remaining!==null && remaining<10) value.classList.add('critical');
      const budget=budgetView(dailyBudget[provider],row,provider);
      const note=node('p','daily-budget'+(budget?.over?' over-budget':''),budget?t('dailyBudget',budget.used,budget.available):t('dailyUnknown'));
      if(budget){const tick=node('i','budget-tick'+(budget.over?' over-budget':''));tick.style.left=`${budget.tick}%`;tick.setAttribute('aria-hidden','true');progress.append(tick);}
      block.append(node('p','label',quotaLabel(row.label)),top,progress,node('p','reset',resetLabel(row)),note);
      section.append(block);
    }
    if(stale) section.append(node('p','note',t('staleNote')));
  }
  const updated=document.querySelector('#updated');updated.dataset.time=state.lastUpdate?localTime(state.lastUpdate):'—';updated.textContent=t('updated',updated.dataset.time);
}
async function send(type) {
  try {const result=await chrome.runtime.sendMessage({type});if(result?.error)throw new Error(result.error);state=result?.state??{};renderOrganizations(result);}
  catch {status.textContent=t('backgroundError');}
}
button.addEventListener('click',async()=>{busy=true;render();await send('refresh');busy=false;render();});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'){if(changes.quotaState)state=changes.quotaState.newValue??{};if(changes.dailyBudget)dailyBudget=changes.dailyBudget.newValue??{};if(changes.quotaState||changes.dailyBudget){render();void chrome.runtime.sendMessage({type:'get-organizations'}).then(renderOrganizations).catch(()=>{});}}});

const organizationSelect=document.querySelector('#claude-organization');
const organizationControl=document.querySelector('#organization-control');
let organizationBusy=false;
function renderOrganizations(info){
 if(!Array.isArray(info?.organizations))return;
 organizationControl.hidden=info.organizations.length<=1;
 organizationSelect.replaceChildren(...info.organizations.map(org=>{const option=document.createElement('option');option.value=org.id;option.textContent=org.name;return option;}));
 organizationSelect.value=info.selectedId??info.organizations[0]?.id??'';
 organizationSelect.disabled=organizationBusy;
}
organizationSelect.addEventListener('change',async()=>{
 organizationBusy=true;organizationSelect.disabled=true;status.textContent=t('organizationLoading');
 try{const result=await chrome.runtime.sendMessage({type:'select-organization',id:organizationSelect.value});if(result?.error)throw Error(result.error);state=result.state??{};renderOrganizations(result);dailyBudget=(await chrome.storage.local.get('dailyBudget')).dailyBudget??{};status.textContent='';render();}
 catch{status.textContent=t('organizationError');try{renderOrganizations(await chrome.runtime.sendMessage({type:'get-organizations'}));}catch{}}
 finally{organizationBusy=false;organizationSelect.disabled=false;}
});

// Paint the local cache immediately, even while organization discovery is offline or slow.
render();void send('get-state').then(render);
setInterval(render,1000);
