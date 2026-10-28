const list=document.querySelector('#reset-events');
const empty=document.querySelector('#reset-empty');
const date=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit'}).formatToParts(value);
const time=value=>new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value);
function render(log) {
  const events=(log?.events??[]).filter(event=>event.kind==='每週').slice(0,5);
  list.replaceChildren();empty.hidden=events.length>0;
  for(const event of events){
    const parts=date(event.detectedAt);
    const stamp=`${parts.find(p=>p.type==='month').value}/${parts.find(p=>p.type==='day').value} ${time(event.detectedAt)}`;
    const item=document.createElement('li');
    const fields=[stamp,`${event.provider==='claude'?'Claude':'Codex'} ${event.kind}`,`重置前剩 ${event.remaining===null?'—':`${event.remaining}%`}（${time(event.observedAt)} 看到）`];
    for(const text of fields){const span=document.createElement('span');span.textContent=text;item.append(span);}
    if(event.early){const tag=document.createElement('span');tag.className='early-reset';tag.textContent='提前重置';item.append(tag);}
    if(event.scheduledAt!==null)item.title=`預定重置：${new Date(event.scheduledAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})}`;
    list.append(item);
  }
}
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.resetLog)render(changes.resetLog.newValue);});
try{render((await chrome.storage.local.get('resetLog')).resetLog);}
catch{empty.textContent='無法讀取重置紀錄';}

const history=document.querySelector('#reset-history');history.hidden=true;
const sections=[...document.querySelectorAll('main>section')];
function toggle(){history.hidden=!history.hidden;for(const section of sections)section.setAttribute('aria-expanded',String(!history.hidden));document.dispatchEvent(new Event('quota-history-changed'));}
for(const section of sections){section.tabIndex=0;section.setAttribute('role','button');section.setAttribute('aria-controls','reset-history');section.setAttribute('aria-expanded','false');section.addEventListener('click',toggle);section.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle();}});}
document.addEventListener('toggle-quota-history',toggle);
