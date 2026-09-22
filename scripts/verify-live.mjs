import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=data=>createHash('sha256').update(data).digest('hex');
for(const file of ['index.html','app.js','config.js']) {
  const response=await fetch(`https://sb.02251121.com/${file}?deployment=${Date.now()}`);
  assert.equal(response.status,200,`${file} status`);
  assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(readFileSync(file)),`${file} deployed content`);
}
const root=await fetch('https://02251121.com/',{redirect:'manual'});
assert.equal(root.status,302);
assert.equal(root.headers.get('location'),'https://jav101.com');
console.log('PASS: chat content matches this commit and root redirect remains intact.');
