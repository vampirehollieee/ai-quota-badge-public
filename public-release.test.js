import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('public build has no automatic export or downloads permission',()=>{
 const manifest=JSON.parse(read('manifest.json'));
 assert.deepEqual(manifest.permissions,['storage','alarms','system.display']);
 assert(!/quota-export|chrome\.downloads|onUpdated/.test(read('background.js')));
 assert(!/onUpdated/.test(read('service.js')));
 assert(!existsSync(new URL('quota-export.js',import.meta.url)));
});
test('public build retains only the two provider host permissions',()=>{
 assert.deepEqual(JSON.parse(read('manifest.json')).host_permissions,['https://claude.ai/*','https://chatgpt.com/*']);
});
