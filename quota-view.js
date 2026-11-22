import {initializeI18n,t,uiLocale} from './i18n.js';
await initializeI18n();
document.documentElement.lang=uiLocale();document.title=t('appTitle');
const dock=location.pathname.endsWith('/dock.html');
if(dock)document.body.classList.add('dock');
try{
  const response=await fetch(new URL('./quota-view.html',import.meta.url));
  if(!response.ok)throw new Error('view');
  // This is a packaged extension template, never remote/provider HTML.
  const template=document.createElement('template');template.innerHTML=await response.text();
  document.body.prepend(template.content.cloneNode(true));
  for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
  document.querySelector('#claude').setAttribute('aria-label',t('claudeQuota'));document.querySelector('#codex').setAttribute('aria-label',t('codexQuota'));
  const button=document.querySelector('#open-dock');
  button.hidden=dock;
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      const result=await chrome.runtime.sendMessage({type:'open-dock'});
      if(!result?.ok)throw new Error('open');
      window.close();
    }catch{document.querySelector('#status').textContent=t('dockError');button.disabled=false;}
  });
  await Promise.all([import('./popup-theme.js'),import('./popup-reset-log.js'),import('./popup.js')]);
}catch{document.body.append(document.createTextNode(t('viewError')));}
