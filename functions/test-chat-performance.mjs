import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const {MessagePresence,NoteFeed,BubbleWindow}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(new URL('../chat-performance.js',import.meta.url))).toString('base64'));

// A loaded message listens only to its scalar timestamp. No 400-message query,
// no new server trigger/table, and a delayed callback after reset cannot delete a new row.
const listeners=new Map(),removed=[];let offs=0;
const presence=new MessagePresence((key,cb)=>{listeners.set(key,cb);return()=>{offs++;listeners.delete(key)}},key=>removed.push(key));
presence.watch('latest');presence.watch('latest');presence.watch('old-history');assert.equal(listeners.size,2);
listeners.get('latest')(true);assert.deepEqual(removed,[]);
const stale=listeners.get('old-history');stale(false);assert.deepEqual(removed,['old-history']);assert.equal(offs,1);
const delayed=listeners.get('latest');presence.clear();presence.watch('latest');delayed(false);assert.deepEqual(removed,['old-history']);
presence.close();assert.equal(listeners.size,0);presence.watch('closed');assert.equal(listeners.size,0);
let immediateOff=0;new MessagePresence((key,cb)=>{cb(false);return()=>immediateOff++},()=>{}).watch('already-deleted');assert.equal(immediateOff,1);
assert.doesNotMatch(source,/limitToLast\(DEL_WINDOW\)/);
assert.match(source,/onValue\(ref\(db, `\$\{base\}\/m\/\$\{key\}\/t`\)/);
assert.match(source,/batch\.forEach\(m => S\.messagePresence\?\.watch\(m\.k\)\)/);

// Unopened notebook has zero subscription/decryption; unchanged ciphertext is
// cached on reopen, edits decode one item, deletes disappear, stale async work is ignored.
let subscriptions=0,unsubscribed=0,decodes=0,received=[];
const feed=new NoteFeed({listen:()=>{subscriptions++;return()=>unsubscribed++},decode:async(k,v)=>{decodes++;return{k,t:v.t,body:v.c}},changed:n=>received=n});
const records={a:{iv:'i',c:'first',t:1},b:{iv:'i',c:'second',t:2}};
assert.equal(subscriptions,0);feed.open();feed.open();assert.equal(subscriptions,1);
await feed.receive(records);assert.equal(decodes,2);assert.deepEqual(received.map(n=>n.k),['b','a']);
await feed.receive({...records,a:{iv:'j',c:'edited',t:3}});assert.equal(decodes,3);assert.equal(received[0].body,'edited');
feed.close();assert.equal(unsubscribed,1);await feed.receive(records);assert.equal(decodes,3);
feed.open();await feed.receive({...records,a:{iv:'j',c:'edited',t:3}});assert.equal(decodes,3);
await feed.receive({b:records.b});assert.deepEqual(received.map(n=>n.k),['b']);
let finish;feed.decode=()=>new Promise(r=>finish=r);const pending=feed.receive({c:{iv:'new',c:'slow',t:4}});feed.close();finish({k:'c',t:4});await pending;assert.deepEqual(received.map(n=>n.k),['b']);
feed.reset();assert.equal(feed.cache.size,0);

// The actual photo pipeline reuses one decoded bitmap, keeps the original
// orientation option, encodes two canvases and closes the bitmap on failure too.
let decoded=0,closed=0,draws=0,fail=false;const dimensions=[];
const bitmap={width:4000,height:3000,close(){closed++}};
const ctx=vm.createContext({Blob,Uint8Array,crypto:{getRandomValues:a=>a,subtle:{encrypt:async()=>new ArrayBuffer(8)}},
  createImageBitmap:async(file,options)=>{assert.equal(options.imageOrientation,'from-image');decoded++;return bitmap},
  document:{createElement:()=>{const cv={getContext:()=>({drawImage(b){assert.equal(b,bitmap);draws++;if(fail)throw Error('encode')}}),toDataURL:()=>{dimensions.push([cv.width,cv.height]);return'data:image/webp;base64,AA=='},toBlob:cb=>{dimensions.push([cv.width,cv.height]);cb(new Blob(['pixels'],{type:'image/webp'}))}};return cv}},
  CFG:{photoThumbSize:320,photoThumbQuality:.7,photoMaxSize:1600,photoQuality:.85},S:{fb:{storage:{},st:{ref:()=>({}),uploadBytesResumable:()=>({on:(name,progress,error,done)=>done()})}},roomId:'fixture',key:{}},Media:{put(){}},mediaId:()=> 'media',b64:()=> 'iv'});
vm.runInContext(source.slice(source.indexOf('async function decodeImage('),source.indexOf('/* 貼圖：小、'))+source.slice(source.indexOf('async function buildPhoto('),source.indexOf('/* 取回原檔')),ctx);
await ctx.buildPhoto({});assert.equal(decoded,1);assert.equal(closed,1);assert.equal(draws,2);assert.deepEqual(dimensions,[[320,240],[1600,1200]]);
fail=true;await assert.rejects(()=>ctx.buildPhoto({}));assert.equal(closed,2);

// Long-list window actually releases children and restores from current message
// data; height placeholders, reference jumps and observer cleanup remain intact.
let observeCallback,disconnects=0,hidden=0,shown=0;
class Observer{constructor(cb){observeCallback=cb}observe(){}unobserve(){}disconnect(){disconnects++}}
const rows=Array.from({length:150},(_,i)=>({dataset:{k:String(i)},style:{},isConnected:true,childNodes:['bubble'],getBoundingClientRect:()=>({height:80}),replaceChildren(...nodes){this.childNodes=nodes}}));
const windowed=new BubbleWindow({root:{clientWidth:400},observer:Observer,makeRow:()=>({childNodes:['fresh']}),beforeHide:()=>{hidden++;return 7},afterShow:(row,saved)=>{shown++;assert.equal(saved,7)}});
rows.forEach(r=>windowed.track(r));observeCallback(rows.map(target=>({target,isIntersecting:false})));
assert.equal(hidden,150);assert.equal(rows[0].childNodes.length,0);assert.equal(rows[0].style.height,'80px');
windowed.reveal('0');assert.deepEqual(rows[0].childNodes,['fresh']);assert.equal(rows[0].style.height,'');assert.equal(shown,1);
observeCallback([{target:rows[1],isIntersecting:true}]);assert.equal(shown,2);
const replacement={...rows[0],dataset:{k:'0'},style:{},childNodes:['replacement']};
windowed.track(replacement);observeCallback([{target:replacement,isIntersecting:true}]);
assert.equal(shown,3,'row replacement restores the saved bubble state');
windowed.forget('2');assert.equal(windowed.rows.has('2'),false);windowed.close();assert.equal(windowed.rows.size,0);assert.equal(disconnects,1);
console.log('PASS: scalar deletion subscriptions/old history/reset races; lazy incremental notebook/decrypt cache/close races; one photo decode/two sizes/failure cleanup; long-list bubble unloading/restoration/height anchors/reference reveal/cleanup.');
