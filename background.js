import './dock-background.js';
import {createUpdater,fetchOrganizations} from './service.js';
import {createOrganizationController} from './organizations.js';
import {initializeI18n,t} from './i18n.js';
import {badge} from './quota.js';
import {createLoggedSave} from './reset-log.js';
const ready=initializeI18n();
const organizations=createOrganizationController(chrome.storage.local);
const load=async()=> (await chrome.storage.local.get('quotaState')).quotaState;
const save=createLoggedSave(chrome.storage.local);
async function paint(state){
 const value=badge(state);await chrome.action.setBadgeText({text:value.text});await chrome.action.setBadgeBackgroundColor({color:value.color});
 await chrome.action.setTitle({title:t('badgeTitle',value.text)+(['claude','codex'].some(k=>state[k]?.status==='error')?t('partialError'):'')});
}
const refresh=createUpdater({load,save,onBadge:paint,selectOrganization:raw=>organizations.resolve(raw)});
// Selection and automatic/manual refreshes share a queue so old requests cannot overwrite a new organization.
let pending=Promise.resolve();
const enqueue=fn=>{const result=pending.then(fn);pending=result.catch(()=>{});return result;};
async function setup(){await ready;if(!await chrome.alarms.get('quota-refresh'))await chrome.alarms.create('quota-refresh',{periodInMinutes:5});await paint(await load()??{});}
const start=()=>{void enqueue(async()=>{await setup();await refresh();}).catch(()=>{});};
chrome.runtime.onInstalled.addListener(start);chrome.runtime.onStartup.addListener(start);
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='quota-refresh')void enqueue(async()=>{await ready;await refresh();}).catch(()=>{});});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||!['get-state','refresh','select-organization','get-organizations'].includes(message.type))return;
 enqueue(async()=>{
  await ready;
  if(message.type==='get-organizations')return organizations.view();
  if(message.type==='get-state'){
   await setup();
   if(!organizations.view().organizations.length){
    // Names are fetched into worker memory only; never persisted with quota data.
    try{await organizations.resolve(await fetchOrganizations());if(!(await load())?.claude)await refresh(true,true);}catch{}
   }
  }
  if(message.type==='refresh')await refresh(true);
  if(message.type==='select-organization'){await organizations.select(message.id);await refresh(true,true);}
  return {state:await load()??{},...organizations.view()};
 }).then(respond).catch(()=>respond({error:t(message.type==='select-organization'?'organizationError':'refreshError')}));
 return true;
});
