import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=data=>createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(readFileSync('.cloud-local/build-manifest.json','utf8'));
for(const file of ['index.html','sw.js',...manifest.immutable]) {
  const path=file==='index.html' ? '' : file;
  const response=await fetch(`https://sb.02251121.com/${path}`, {headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(20000)});
  assert.equal(response.status,200,`${file} status`);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())),manifest.hashes[file],`${file} deployed content`);
  if(manifest.immutable.includes(file)) assert.match(response.headers.get('cache-control')||'',/immutable/,`${file} long cache`);
}
const coverSetting=await fetch('https://daily-notes-7bb64-default-rtdb.asia-southeast1.firebasedatabase.app/settings/errorCover.json',{signal:AbortSignal.timeout(20000)});
assert.equal(coverSetting.status,200,'error cover display setting is readable');
const coverEnabled=await coverSetting.json();
assert.ok(coverEnabled===null||typeof coverEnabled==='boolean','error cover display setting is boolean or default');
const root=await fetch('https://02251121.com/',{redirect:'manual'});
assert.equal(root.status,302);
assert.equal(root.headers.get('location'),'https://jav101.com');
console.log('PASS: chat content matches this commit and root redirect remains intact.');
