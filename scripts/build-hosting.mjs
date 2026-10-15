import { mkdir, copyFile, writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build, transform } from 'esbuild';
import sharp from 'sharp';

const dir = '.hosting-build';
await mkdir(dir, { recursive: true });
// Public output only: never traverse or remove any other directory.
for (const entry of await readdir(dir, { withFileTypes: true })) {
  if (!entry.isFile()) throw new Error(`Unexpected directory in public output: ${entry.name}`);
  await unlink(`${dir}/${entry.name}`);
}
const files = ['app.js','chat-performance.js','assets.js','config.js','index.html','pending.html','style.css','manifest.json','apple-touch-icon.png','favicon-32.png','icon-192.png','icon-512.png','error-cover.png'];
// Compatibility aliases for already-open shells; new shells load hashed assets.
for (const file of files) await copyFile(file, `${dir}/${file}`);
const digest = data => createHash('sha256').update(data).digest('hex').slice(0, 16);
const hashed = async (name, ext, data) => {
  const file = `${name}-${digest(data)}.${ext}`;
  await writeFile(`${dir}/${file}`, data);
  return file;
};
const bundled = await build({
  entryPoints: ['app.js'], bundle: true, splitting: true, format: 'esm',
  target: 'es2022', minify: true, legalComments: 'eof', outdir: dir,
  entryNames: '[name]-[hash]', chunkNames: 'chunk-[name]-[hash]', metafile: true,
});
const outputs = Object.entries(bundled.metafile.outputs);
const app = outputs.find(([, info]) => info.entryPoint === 'app.js')[0].split('/').pop();
const css = await hashed('style', 'css', (await transform(await readFile('style.css', 'utf8'), { loader: 'css', minify: true })).code);
const config = await hashed('config', 'js', await readFile('config.js'));
// Lossless format conversion preserves every pixel and the existing SVG crop.
const robot = await hashed('error-cover', 'webp', await sharp('error-cover.png').webp({ lossless: true, effort: 6 }).toBuffer());
let html = await readFile('index.html', 'utf8');
for (const [old, next] of [['app.js',app],['style.css',css],['config.js',config],['error-cover.png',robot]]) html = html.replaceAll(`"${old}"`, `"${next}"`);
await writeFile(`${dir}/index.html`, html);
const immutable = [app, css, config, robot, ...outputs.filter(([,info]) => info.entryPoint !== 'app.js').map(([file]) => file.split('/').pop())];
let sw = await readFile('sw.js', 'utf8');
sw = sw.replace('const IMMUTABLE = new Set([]);', `const IMMUTABLE = new Set(${JSON.stringify(immutable.map(f => '/' + f))});`);
const shell = ['./','./index.html',`./${app}`,`./${css}`,`./${config}`,`./${robot}`,'./manifest.json','./favicon-32.png','./apple-touch-icon.png','./icon-192.png','./icon-512.png'];
sw = sw.replace(/const SHELL = \[[\s\S]*?\];/, `const SHELL = ${JSON.stringify(shell)};`);
await writeFile(`${dir}/sw.js`, sw);
const firebase = JSON.parse(await readFile('firebase.json','utf8'));
firebase.hosting.public = dir;
// Exact hashed paths only. HTML, the SW, OAuth and Firebase stay network-first.
for (const file of immutable) firebase.hosting.headers.push({ source: '/' + file, headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] });
await writeFile('.firebase-cloud.json', JSON.stringify(firebase,null,2)+'\n');
const hashes = {};
for (const file of await readdir(dir)) hashes[file] = createHash('sha256').update(await readFile(`${dir}/${file}`)).digest('hex');
// Kept outside public output; usable by CI after the build and deployment.
await mkdir('.cloud-local', { recursive: true });
await writeFile('.cloud-local/build-manifest.json', JSON.stringify({ app, css, config, robot, immutable, hashes },null,2));
console.log(`Prepared ${Object.keys(hashes).length} allowlisted public files, including ${immutable.length} immutable assets. No credentials or source tools are included.`);
