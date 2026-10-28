import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restoreBounds,createDockController} from './dock-window.js';
const primary={id:'main',isPrimary:true,workArea:{left:0,top:0,width:1920,height:1040}};
const secondary={id:'side',isPrimary:false,workArea:{left:-1600,top:0,width:1600,height:900}};
test('restores negative coordinates and size on the same monitor, including moved monitor origin',()=>{
 const saved={left:-1500,top:100,width:600,height:700,displayId:'side',origin:{left:-1600,top:0}};
 assert.deepEqual(restoreBounds(saved,[primary,secondary]),{left:-1500,top:100,width:600,height:700});
 assert.deepEqual(restoreBounds(saved,[primary,{...secondary,workArea:{...secondary.workArea,left:1920}}]),{left:2020,top:100,width:600,height:700});
});
test('removed monitor falls back to primary center and oversized windows fit work area',()=>{
 assert.deepEqual(restoreBounds({left:-1500,top:100,width:600,height:700,displayId:'gone'},[primary]),{left:660,top:170,width:600,height:700});
 assert.deepEqual(restoreBounds({left:20,top:20,width:3000,height:2000},[primary]),{left:0,top:0,width:1920,height:1040});
});
test('simultaneous open requests create one popup; restart finds and focuses existing dock; reopen restores saved geometry',async()=>{
 let contexts=[],created=0,store={},window;
 const api={runtime:{getURL:path=>'chrome-extension://test/'+path,getContexts:async()=>contexts},system:{display:{getInfo:async()=>[primary,secondary]}},storage:{local:{get:async()=>structuredClone(store),set:async value=>{Object.assign(store,structuredClone(value));}}},windows:{
   create:async opts=>{created++;assert.equal(opts.type,'popup');assert.equal(opts.url,'chrome-extension://test/dock.html');window={...opts,id:7,state:'normal'};contexts=[{windowId:7}];return window;},
   get:async()=>window,update:async(id,opts)=>{assert.equal(id,7);window={...window,...opts};return window;}
 }};
 const c=createDockController(api);await Promise.all([c.open(),c.open()]);assert.equal(created,1);
 window={...window,left:-1450,top:70,width:520,height:760};await c.remember(window);
 window.state='minimized';await createDockController(api).open();assert.equal(created,1);assert.equal(window.focused,true);assert.equal(window.state,'normal');
 contexts=[];await createDockController(api).open();assert.equal(created,2);assert.equal(window.left,-1450);assert.equal(window.top,70);assert.equal(window.width,520);assert.equal(window.height,760);
 const before=structuredClone(store.dockBounds);await c.remember({...window,state:'maximized',width:1920});assert.deepEqual(store.dockBounds,before);
});

test('a newly created window is reused before its document context is ready',async()=>{
 let created=0;
 const api={runtime:{getURL:()=> 'dock.html',getContexts:async()=>[]},system:{display:{getInfo:async()=>[primary]}},storage:{local:{get:async()=>({}),set:async()=>{}}},windows:{create:async opts=>{created++;return {...opts,id:8,state:'normal'};},get:async()=>({id:8,state:'normal'}),update:async()=>{}}};
 const dock=createDockController(api);await dock.open();await dock.open();assert.equal(created,1);
 dock.closed(8);await dock.open();assert.equal(created,2);
});
