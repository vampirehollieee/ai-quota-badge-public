import {createThemeController} from './theme.js';
const button=document.querySelector('#theme-toggle');
const media=matchMedia('(prefers-color-scheme: dark)');
function apply(theme){
  document.documentElement.dataset.theme=theme;
  button.dataset.themeState=theme;
  const label=theme==='dark'?'切換為淺色模式':'切換為深色模式';
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
catch{document.querySelector('#status').textContent='無法讀取主題偏好，目前跟隨系統。';}
finally{button.disabled=false;}
media.addEventListener('change',()=>controller.systemChanged());
button.addEventListener('click',async()=>{
  button.disabled=true;
  try{await controller.toggle();}
  catch{document.querySelector('#status').textContent='無法儲存主題偏好，請稍後再試。';}
  finally{button.disabled=false;}
});
