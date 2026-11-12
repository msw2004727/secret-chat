import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

/* functions 底下被 index.js 載入的程式（*.js）以及套件清單才要部署函式。
   只改 test-*.mjs 不會把函式送上去。 */
export function isFunctionsRuntime(file) {
  if (typeof file !== 'string' || !file.startsWith('functions/')) return false;
  if (/^functions\/test-.*\.mjs$/.test(file)) return false;
  if (/^functions\/package(-lock)?\.json$/.test(file)) return true;
  return /^functions\/.+\.js$/.test(file);
}

export function deployOnly(changed, full) {
  const files = Array.isArray(changed) ? changed.filter(Boolean) : [];
  const only = ['hosting'];
  if (full || files.some(isFunctionsRuntime)) only.push('functions');
  if (full || files.includes('database.rules.json')) only.push('database');
  if (full || files.includes('storage.rules')) only.push('storage');
  return only;
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  let changed = [];
  const full = process.env.REQUESTED === 'full';
  if (process.env.EVENT === 'push') {
    const before = process.env.BEFORE;
    // Initial migration only republishes Hosting; backend is verified via explicit full dispatch.
    if (before && !/^0+$/.test(before)) {
      const out = execFileSync('git', ['diff', '--name-only', before, 'HEAD'], {encoding: 'utf8'}).trim();
      changed = out ? out.split('\n') : [];
    }
  }
  const only = deployOnly(changed, full);
  appendFileSync(process.env.GITHUB_OUTPUT, `only=${only.join(',')}\n`);
  console.log(`Deployment scope: ${only.join(',')}`);
}
