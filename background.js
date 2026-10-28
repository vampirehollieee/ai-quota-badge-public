import './dock-background.js';
import {createUpdater} from './service.js';
import {badge} from './quota.js';
import {createLoggedSave} from './reset-log.js';
const load=async()=> (await chrome.storage.local.get('quotaState')).quotaState;
const save=createLoggedSave(chrome.storage.local);
async function paint(state) {
  const value=badge(state);
  await chrome.action.setBadgeText({text:value.text});
  await chrome.action.setBadgeBackgroundColor({color:value.color});
  await chrome.action.setTitle({title:`AI 額度 · 最少剩餘 ${value.text}${['claude','codex'].some(k=>state[k]?.status==='error')?'（部分來源讀取失敗）':''}`});
}
const refresh=createUpdater({load,save,onBadge:paint});
async function setup() {
  const alarm=await chrome.alarms.get('quota-refresh');
  if (!alarm) await chrome.alarms.create('quota-refresh',{periodInMinutes:5});
  await paint(await load()??{});
}
chrome.runtime.onInstalled.addListener(()=>{void setup().then(refresh).catch(()=>{});});
chrome.runtime.onStartup.addListener(()=>{void setup().then(refresh).catch(()=>{});});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='quota-refresh') void refresh().catch(()=>{});});
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if (sender.id!==chrome.runtime.id) return;
  if (message.type==='get-state') {
    setup().then(load).then(state=>sendResponse({state:state??{}})).catch(()=>sendResponse({error:'無法讀取本機狀態'}));
    return true;
  }
  if (message.type==='refresh') {
    refresh(true).then(state=>sendResponse({state})).catch(()=>sendResponse({error:'更新失敗，請重新開啟小視窗'}));
    return true;
  }
});
