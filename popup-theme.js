import {t} from './i18n.js';
import {createThemeController} from './theme.js';
const button=document.querySelector('#theme-toggle');
const media=matchMedia('(prefers-color-scheme: dark)');
function apply(theme){
  document.documentElement.dataset.theme=theme;
  button.dataset.themeState=theme;
  const label=t(theme==='dark'?'themeLight':'themeDark');
  button.setAttribute('aria-label',label);
  button.setAttribute('aria-pressed',String(theme==='dark'));
  button.title=label;
}
apply(media.matches?'dark':'light');
const controller=createThemeController({
  read:async()=>(await chrome.storage.local.get('popupTheme')).popupTheme,
  write:theme=>chrome.storage.local.set({popupTheme:theme}),
  systemDark:()=>media.matches,apply
});
button.disabled=true;
try{await controller.init();}
catch{document.querySelector('#status').textContent=t('themeReadError');}
finally{button.disabled=false;}
media.addEventListener('change',()=>controller.systemChanged());
button.addEventListener('click',async()=>{
  button.disabled=true;
  try{await controller.toggle();}
  catch{document.querySelector('#status').textContent=t('themeSaveError');}
  finally{button.disabled=false;}
});
