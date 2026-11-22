import {readFileSync} from 'node:fs';
import {setCatalog} from './i18n.js';
setCatalog(JSON.parse(readFileSync(new URL('./_locales/zh_TW/messages.json',import.meta.url))), 'zh-TW');
