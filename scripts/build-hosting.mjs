import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
const files = ['app.js','assets.js','config.js','index.html','pending.html','style.css','sw.js','manifest.json','apple-touch-icon.png','favicon-32.png','icon-192.png','icon-512.png'];
await mkdir('.hosting-build', {recursive:true});
for (const file of files) await copyFile(file, `.hosting-build/${file}`);
const config = JSON.parse(await readFile('firebase.json','utf8'));
config.hosting.public = '.hosting-build';
await writeFile('.firebase-cloud.json', JSON.stringify(config,null,2)+'\n');
console.log(`Prepared ${files.length} public files; deployment excludes source tools and credentials.`);
