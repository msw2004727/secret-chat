import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import sharp from 'sharp';
await import('../scripts/build-hosting.mjs');
const manifest=JSON.parse(fs.readFileSync('.cloud-local/build-manifest.json','utf8'));
const built=file=>fs.readFileSync(`.hosting-build/${file}`);
const html=built('index.html').toString(),sw=built('sw.js').toString();
for(const file of [manifest.app,manifest.css,manifest.config,manifest.robot])assert.ok(html.includes(`"${file}"`));
assert.deepEqual(built(manifest.config),fs.readFileSync('config.js'),'room fingerprints/config remain byte-identical');
assert.ok(built(manifest.app).length<fs.statSync('app.js').size*.6,'smaller main script');
assert.ok(built(manifest.robot).length<fs.statSync('error-cover.png').size*.7,'smaller image');
assert.deepEqual(await sharp(built(manifest.robot)).raw().toBuffer(),await sharp('error-cover.png').raw().toBuffer(),'lossless image pixels');
assert.equal(fs.readdirSync('.hosting-build').some(f=>/env|credential|manifest\.json$/.test(f)&&f!=='manifest.json'),false);
const firebase=JSON.parse(fs.readFileSync('.firebase-cloud.json','utf8'));
assert.equal(firebase.hosting.site,'daily-notes-7bb64');
for(const file of manifest.immutable){const rule=firebase.hosting.headers.find(h=>h.source==='/'+file);assert.ok(rule);assert.match(rule.headers[0].value,/immutable/)}
assert.equal(firebase.hosting.headers.some(h=>/index\.html|sw\.js/.test(h.source)&&h.headers.some(x=>/immutable/.test(x.value))),false);
assert.equal(sw.match(/const SHELL = ([^;]+);/)[1].includes('chunk-assets'),false,'stickers stay lazy');
let reads=0,offline=false,storageFails=false,putFails=false,installFails=false,activated=0;const events={},cache=new Map();
const response=()=>({status:200,ok:true,type:'basic',clone(){return this}});
const ctx=vm.createContext({URL,Response,self:{location:{origin:'https://fixture.invalid'},skipWaiting:()=>{activated++},addEventListener:(name,fn)=>events[name]=fn},
  caches:{open:async()=>{if(storageFails)throw Error('storage disabled');return{addAll:async()=>{if(installFails)throw Error('incomplete shell')},match:async req=>cache.get(req.url),put:async(req,res)=>{if(putFails)throw Error('quota');cache.set(req.url,res)}}},match:async()=>cache.get('offline-shell')},
  fetch:async()=>{reads++;if(offline)throw Error('offline');return response()}});
vm.runInContext(sw,ctx);
const request=async(path,options={})=>{let promise;events.fetch({request:{method:'GET',url:'https://fixture.invalid'+path,...options},respondWith:p=>promise=p});return promise?await promise:null};
const asset='/'+manifest.app;await request(asset);assert.equal(reads,1);await request(asset);assert.equal(reads,1,'hashed assets use cache');
offline=true;assert.ok(await request(asset),'cached JS works offline');offline=false;
await request('/');await request('/');assert.equal(reads,3,'HTML always checks network');
assert.equal(await request('/?code=private&state=secret'),null,'OAuth callback never cached');
assert.equal(await request('/'+manifest.app,{method:'POST'}),null,'writes untouched');
cache.set('offline-shell',response());offline=true;assert.ok(await request('/',{mode:'navigate'}),'offline homepage fallback');
offline=false;storageFails=true;assert.ok(await request('/'+manifest.css),'storage disabled still loads over network');
storageFails=false;putFails=true;assert.ok(await request('/'+manifest.robot),'quota exhaustion still returns network response');
let installation;installFails=true;events.install({waitUntil:p=>installation=p});await assert.rejects(()=>installation);assert.equal(activated,0,'incomplete shell keeps previous worker');
installFails=false;events.install({waitUntil:p=>installation=p});await installation;assert.equal(activated,1,'complete new shell can activate');
console.log('PASS: hashed build/assets/cache headers, byte-identical config and lossless image, smaller bundles, lazy stickers, cache hits/offline recovery and OAuth/write bypass.');
