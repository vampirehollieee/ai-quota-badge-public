export const selectLocale=language=>String(language??'en').toLowerCase().startsWith('zh')?'zh_TW':'en';
let catalog={},locale='en';
export function setCatalog(messages,language='en'){catalog=messages;locale=selectLocale(language);}
export function formatMessage(messages,key,values=[]){return (messages[key]?.message??key).replace(/\$(\d+)/g,(_,n)=>String(values[Number(n)-1]??''));}
export const t=(key,...values)=>formatMessage(catalog,key,values);
export const uiLocale=()=>locale==='zh_TW'?'zh-TW':'en';
export async function initializeI18n(){
 const language=globalThis.chrome?.i18n?.getUILanguage?.()??'en';
 const response=await fetch(new URL(`./_locales/${selectLocale(language)}/messages.json`,import.meta.url));
 if(!response.ok)throw Error('Locale unavailable');setCatalog(await response.json(),language);
}
// No explicit timeZone: use the user's operating-system timezone.
export const localTime=value=>new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value);
export const localDateTime=value=>new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(value);
export function quotaLabel(label){
 if(label==='每週')return t('weekly');if(label==='5 小時')return t('fiveHour');if(label==='週期 —')return t('unknownWindow');
 return label.replace(/^每週/,t('weekly')).replace('OAuth 應用程式',t('oauthApps'));
}
