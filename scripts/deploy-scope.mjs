import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
let changed=[];
const full=process.env.REQUESTED==='full';
if(process.env.EVENT==='push') {
  const before=process.env.BEFORE;
  // Initial migration only republishes Hosting; backend is verified via explicit full dispatch.
  if(before && !/^0+$/.test(before)) changed=execFileSync('git',['diff','--name-only',before,'HEAD'],{encoding:'utf8'}).trim().split('\n');
}
const only=['hosting'];
if(full || changed.some(f=>/^functions\/(index\.js|package(-lock)?\.json)$/.test(f))) only.push('functions');
if(full || changed.includes('database.rules.json')) only.push('database');
if(full || changed.includes('storage.rules')) only.push('storage');
appendFileSync(process.env.GITHUB_OUTPUT,`only=${only.join(',')}\n`);
console.log(`Deployment scope: ${only.join(',')}`);
