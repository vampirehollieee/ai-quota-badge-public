const finite=n=>typeof n==='number'&&Number.isFinite(n);
const active=displays=>displays.filter(d=>d.isEnabled!==false&&d.activeState!=='inactive');
const overlap=(a,b)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
function containing(bounds,displays){return displays.map(d=>({display:d,area:overlap(bounds,d.workArea)})).filter(d=>d.area>0).sort((a,b)=>b.area-a.area)[0]?.display;}
export function restoreBounds(saved,displays) {
  const screens=active(displays);
  const primary=screens.find(d=>d.isPrimary)??screens[0];
  if(!primary)throw new Error('無法讀取螢幕範圍');
  const valid=saved&&['left','top','width','height'].every(k=>finite(saved[k]))&&saved.width>0&&saved.height>0;
  let screen=valid?screens.find(d=>d.id===saved.displayId):null;
  let left=saved?.left,top=saved?.top;
  if(screen&&finite(saved.origin?.left)&&finite(saved.origin?.top)){
    left+=screen.workArea.left-saved.origin.left;top+=screen.workArea.top-saved.origin.top;
  }
  if(!screen&&valid)screen=containing(saved,screens);
  // A remembered monitor can change resolution; a fully off-screen position returns to primary.
  if(screen&&valid&&!overlap({...saved,left,top},screen.workArea))screen=null;
  const center=!screen;screen??=primary;
  const area=screen.workArea;
  const width=Math.min(area.width,Math.max(320,Math.round(valid?saved.width:680)));
  const height=Math.min(area.height,Math.max(300,Math.round(valid?saved.height:820)));
  if(center){left=area.left+(area.width-width)/2;top=area.top+(area.height-height)/2;}
  return {left:Math.round(Math.max(area.left,Math.min(left,area.left+area.width-width))),top:Math.round(Math.max(area.top,Math.min(top,area.top+area.height-height))),width,height};
}
export function createDockController(api) {
  const url=api.runtime.getURL('dock.html');
  let opening=null,writes=Promise.resolve(),knownId=null;
  const contexts=()=>api.runtime.getContexts({contextTypes:['TAB'],documentUrls:[url]});
  function remember(window){
    const known=window.id===knownId;
    const write=async()=>{
      if(window.state!=='normal'||!['left','top','width','height'].every(k=>finite(window[k])))return;
      if(!known&&!(await contexts()).some(c=>c.windowId===window.id))return;
      const displays=active(await api.system.display.getInfo());
      const display=containing(window,displays);
      if(!display)return;
      const {left,top,width,height}=window;
      await api.storage.local.set({dockBounds:{left,top,width,height,displayId:display.id,origin:{left:display.workArea.left,top:display.workArea.top}}});
    };
    const result=writes.then(write);writes=result.catch(()=>{});return result;
  }
  async function open(){
    await writes;
    const existing=(await contexts())[0]??(knownId===null?null:{windowId:knownId});
    if(existing){
      const window=await api.windows.get(existing.windowId);
      knownId=window.id;
      await api.windows.update(window.id,{focused:true,...(window.state==='minimized'?{state:'normal'}:{})});
      return;
    }
    const {dockBounds}=await api.storage.local.get('dockBounds');
    const bounds=restoreBounds(dockBounds,await api.system.display.getInfo());
    const window=await api.windows.create({url,type:'popup',focused:true,...bounds});
    knownId=window.id;
    await remember(window);
  }
  return {remember,closed(id){if(id===knownId)knownId=null;},open(){if(!opening)opening=open().finally(()=>{opening=null;});return opening;}};
}
