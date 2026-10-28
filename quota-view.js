const dock=location.pathname.endsWith('/dock.html');
if(dock)document.body.classList.add('dock');
try{
  const response=await fetch(new URL('./quota-view.html',import.meta.url));
  if(!response.ok)throw new Error('view');
  // This is a packaged extension template, never remote/provider HTML.
  const template=document.createElement('template');template.innerHTML=await response.text();
  document.body.prepend(template.content.cloneNode(true));
  const button=document.querySelector('#open-dock');
  button.hidden=dock;
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      const result=await chrome.runtime.sendMessage({type:'open-dock'});
      if(!result?.ok)throw new Error('open');
      window.close();
    }catch{document.querySelector('#status').textContent='無法開啟獨立視窗，請確認已重新載入擴充功能並允許螢幕資訊權限。';button.disabled=false;}
  });
  await Promise.all([import('./popup-theme.js'),import('./popup-reset-log.js'),import('./popup.js')]);
}catch{document.body.append(document.createTextNode('無法載入畫面，請重新載入擴充功能。'));}
