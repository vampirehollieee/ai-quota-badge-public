import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectLocale,formatMessage,localTime,localDateTime} from './i18n.js';
const catalogs=Object.fromEntries(['en','zh_TW'].map(l=>[l,JSON.parse(readFileSync(new URL(`./_locales/${l}/messages.json`,import.meta.url)))]));
test('all Chinese UI languages use Traditional Chinese; every other language uses English',()=>{for(const s of ['zh','zh-CN','zh-TW','zh-HK'])assert.equal(selectLocale(s),'zh_TW');for(const s of ['en-US','ja','de','fr'])assert.equal(selectLocale(s),'en');});
test('catalogs have identical keys, placeholders, and nonempty translations',()=>{assert.deepEqual(Object.keys(catalogs.en).sort(),Object.keys(catalogs.zh_TW).sort());for(const key of Object.keys(catalogs.en)){assert(catalogs.en[key].message);assert(catalogs.zh_TW[key].message);assert.deepEqual(catalogs.en[key].message.match(/\$\d/g),catalogs.zh_TW[key].message.match(/\$\d/g));}assert.equal(formatMessage(catalogs.en,'remaining',[44]),'44% left');});
test('time formatters use default local timezone across a date boundary',()=>{const time=Date.parse('2030-01-01T00:30:00Z');assert.equal(localTime(time),new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(time));assert.equal(localDateTime(time),new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(time));});
