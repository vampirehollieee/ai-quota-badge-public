import {createDockController} from './dock-window.js';
const dock=createDockController(chrome);
chrome.windows.onRemoved.addListener(id=>dock.closed(id));
chrome.windows.onBoundsChanged.addListener(window=>{void dock.remember(window).catch(()=>console.warn('無法儲存獨立視窗位置'));});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender.id!==chrome.runtime.id||message.type!=='open-dock')return;
  dock.open().then(()=>respond({ok:true})).catch(()=>respond({error:'無法開啟獨立視窗，請確認擴充功能已重新載入並允許螢幕資訊權限。'}));
  return true;
});
