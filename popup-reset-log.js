import {t,localTime,localDateTime,quotaLabel} from './i18n.js';
const list=document.querySelector('#reset-events');
const empty=document.querySelector('#reset-empty');
function render(log){
 const events=(log?.events??[]).filter(event=>event.kind==='每週').slice(0,5);list.replaceChildren();empty.hidden=events.length>0;
 for(const event of events){
  const stamp=new Intl.DateTimeFormat(undefined,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(event.detectedAt);
  const item=document.createElement('li');
  const fields=[stamp,`${event.provider==='claude'?'Claude':'Codex'} ${quotaLabel(event.kind)}`,t('historyRemaining',event.remaining===null?'—':`${event.remaining}%`,localTime(event.observedAt))];
  for(const text of fields){const span=document.createElement('span');span.textContent=text;item.append(span);}
  if(event.early){const tag=document.createElement('span');tag.className='early-reset';tag.textContent=t('earlyReset');item.append(tag);}
  if(event.scheduledAt!==null)item.title=t('scheduledReset',localDateTime(event.scheduledAt));list.append(item);
 }
}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.resetLog)render(changes.resetLog.newValue);});
try{render((await chrome.storage.local.get('resetLog')).resetLog);}catch{empty.textContent=t('historyFailed');}
const history=document.querySelector('#reset-history');history.hidden=true;
const sections=[...document.querySelectorAll('main>section')];
function toggle(){history.hidden=!history.hidden;for(const section of sections)section.setAttribute('aria-expanded',String(!history.hidden));document.dispatchEvent(new Event('quota-history-changed'));}
for(const section of sections){section.tabIndex=0;section.setAttribute('role','button');section.setAttribute('aria-controls','reset-history');section.setAttribute('aria-expanded','false');section.addEventListener('click',toggle);section.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}});}
document.addEventListener('toggle-quota-history',toggle);
