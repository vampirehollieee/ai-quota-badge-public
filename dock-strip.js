import {t} from './i18n.js';
import {compactReset,stripCellFill,stripLayout} from './dock-strip-format.js';
document.documentElement.classList.add('dock-document');
await import('./quota-view.js');
const full=document.createElement('div');full.className='dock-full';
for(const child of [...document.body.children])if(child.tagName!=='SCRIPT')full.append(child);
document.body.append(full);
const strip=document.createElement('div');strip.className='dock-strip';strip.hidden=true;
const items=document.createElement('div');items.className='strip-items';
const update=document.createElement('button');update.id='strip-update';update.type='button';update.setAttribute('aria-label',t('refreshQuota'));
const stripHistory=document.createElement('div');stripHistory.className='strip-history';
strip.append(items,update,stripHistory);document.body.append(strip);
const originalUpdate=full.querySelector('#refresh');
update.addEventListener('click',()=>{if(!originalUpdate.disabled)originalUpdate.click();});
const element=(tag,className,text)=>{const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;};
function renderStrip(){
  items.replaceChildren();
  for(const provider of ['claude','codex']){
    const section=full.querySelector(`#${provider}`);
    const name=section.querySelector('h2')?.textContent??provider;
    for(const row of section.querySelectorAll('.quota')){
      const sourceMeter=row.querySelector('.pixel-meter');
      const raw=sourceMeter.getAttribute('aria-valuenow');
      const remaining=raw===null?null:Number(raw);
      const item=element('div','strip-item');item.dataset.level=sourceMeter.dataset.level;item.dataset.stale=row.dataset.stale;
      const label=`${name} ${row.querySelector('.label').textContent}`;
      const meter=element('div','strip-meter');meter.setAttribute('role','progressbar');meter.setAttribute('aria-label',t('quotaAria',label,remaining??t('unknown')));meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');
      if(remaining!==null)meter.setAttribute('aria-valuenow',String(remaining));
      for(let i=0;i<10;i++){const cell=element('span','');cell.style.setProperty('--cell-fill',`${stripCellFill(remaining,i)}%`);cell.setAttribute('aria-hidden','true');meter.append(cell);}
      const error=section.querySelector('.error')?.textContent;
      item.title=error??row.querySelector('.reset').textContent;
      const heading=element('div','strip-heading');
      heading.append(element('span','strip-name',label),document.createTextNode(' · '),element('span','strip-reset',error?t('networkError'):compactReset(row.querySelector('.reset').textContent)));
      const bar=element('div','strip-bar-row');
      bar.append(element('span','strip-value',remaining===null?t('remainingUnknown'):t('remaining',remaining)+(row.dataset.stale==='true'?t('staleMark'):'')),meter);
      const tick=row.querySelector('.budget-tick');if(tick)meter.append(tick.cloneNode(true));
      const budget=row.querySelector('.daily-budget');
      item.append(heading,bar);if(budget)item.append(budget.cloneNode(true));
      item.tabIndex=0;item.setAttribute('role','button');item.setAttribute('aria-expanded',String(!full.querySelector('#reset-history').hidden));
      const toggle=()=>document.dispatchEvent(new Event('toggle-quota-history'));
      item.addEventListener('click',toggle);item.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
      items.append(item);
    }
  }
  const history=full.querySelector('#reset-history');stripHistory.replaceChildren();stripHistory.hidden=history.hidden;if(!history.hidden){const clone=history.cloneNode(true);clone.removeAttribute('id');for(const el of clone.querySelectorAll('[id]'))el.removeAttribute('id');stripHistory.append(clone);}
  update.textContent=full.querySelector('#updated').dataset.time??'—';
  update.disabled=originalUpdate.disabled;
  update.title=full.querySelector('#status').textContent||t('refreshQuota');
}
function layout(){
  const compact=document.documentElement.clientHeight<=200;
  full.hidden=compact;strip.hidden=!compact;
  document.body.dataset.mode=compact?'strip':'full';
  if(compact){
    items.style.setProperty('--strip-font','11px');items.style.setProperty('--strip-pad-y','4px');items.classList.add('measuring');items.classList.remove('tight');
    const minWidth=Math.max(1,...[...items.children].map(item=>item.getBoundingClientRect().width));
    items.classList.remove('measuring');
    const available=items.clientWidth;
    const size=stripLayout(available,items.children.length,minWidth);
    items.style.setProperty('--strip-columns',2);items.style.setProperty('--strip-font',`${size.font}px`);
    items.classList.toggle('tight',available<minWidth);
    const rows=Math.ceil(items.children.length/size.columns);
    const style=getComputedStyle(strip);
    const height=strip.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
    let rowHeight=Math.max(0,...[...items.children].map(item=>item.getBoundingClientRect().height));
    if(rowHeight*rows>height){items.style.setProperty('--strip-font','11px');items.style.setProperty('--strip-pad-y','0px');rowHeight=Math.max(0,...[...items.children].map(item=>item.getBoundingClientRect().height));}
    items.style.rowGap=Math.max(0,Math.min(14,(height-rowHeight*rows)/Math.max(1,rows-1)))+'px';
  }else{
    full.style.transform='none';
    const scale=Math.min(1,document.documentElement.clientHeight/full.scrollHeight,document.documentElement.clientWidth/full.scrollWidth);
    full.style.transform=`scale(${scale})`;
  }
}
let scheduled=false;
function refresh(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;renderStrip();layout();});}
// Observe only shared UI outputs; do not fetch, normalize or store provider data here.
new MutationObserver(refresh).observe(full,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled']});
new ResizeObserver(refresh).observe(document.documentElement);
document.addEventListener('quota-history-changed',refresh);
document.fonts.ready.then(refresh);
refresh();
