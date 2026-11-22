import {t} from './i18n.js';
export function stripCellFill(remaining,index){return typeof remaining==='number'&&Number.isFinite(remaining)?Math.max(0,Math.min(100,(remaining-index*10)*10)):0;}
export function compactReset(text){
  if(text===t('resetUnknown'))return '—';
  if(text===t('resetSoon'))return t('compactSoon');
  if(text===t('resetPending'))return t('pending');
  const match=text.match(/^(?:(\d+) 天 )?(?:(\d+) 小時 )?(\d+) 分後重置$/);
  if(match)return `${Number(match[1]??0)*24+Number(match[2]??0)}:${match[3].padStart(2,'0')} 後`;
  return text.replace(/ 重置$/,'').replace(/^Resets /,'');
}
export function stripLayout(width,count,minWidth){
  const columns=Math.max(1,Math.min(count,Math.floor(width/minWidth)));
  return {columns,font:Math.max(11,Math.min(13,Math.floor(11*width/(columns*minWidth)*100)/100))};
}
