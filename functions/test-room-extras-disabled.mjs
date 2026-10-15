import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
let burns=0,loves=0,reads=0;
const forbidden=()=>{throw Error('Disabled feature attempted work')};
const ctx=vm.createContext({S:{roomId:'fixture',bumpHeart:forbidden},connect:forbidden,$:forbidden,setTimeout:forbidden,setInterval:forbidden,clearTimeout(){},clearInterval(){},Miss:{stop(){}},Love:{reset(){loves++}},Burn:{reset(){burns++}},ReadMark:{forget(){reads++}}});
vm.runInContext(src.match(/^const ROOM_EXTRAS_ENABLED = .*$/m)[0]+';globalThis.enabled=ROOM_EXTRAS_ENABLED',ctx);
assert.equal(ctx.enabled,false);
vm.runInContext(src.slice(src.indexOf('const Plant = {'),src.indexOf('\nfunction bindPlant()'))+';globalThis.plant=Plant',ctx);
vm.runInContext(src.slice(src.indexOf('const Heart = {'),src.indexOf('/* 飄浮愛心的五種粉。'))+';globalThis.heart=Heart',ctx);
for(const [start,end] of [['function bindPlant()','/* ────────── 第二道密碼'],['function bindHeart()','const HeartNum = {'],['function bindHeartNum()','function bindNotes()'],['async function admPlantOpen(i)','async function admPlantSetStage()'],['async function admPlantSetStage()','async function admPlantReset()'],['async function admPlantReset()','const AdmG2 =']]) {
  const a=src.indexOf(start),b=src.indexOf(end,a);
  assert.ok(a>=0&&b>a,`test extraction: ${start}`);
  vm.runInContext(src.slice(a,b),ctx);
}
ctx.bindPlant();ctx.bindHeart();ctx.bindHeartNum();
await ctx.plant.load('rooms/fixture');ctx.plant.on=true;
ctx.plant.paint(true);ctx.plant.openFan();await ctx.plant.act('w');await ctx.plant.pay('w');
ctx.heart.tap();ctx.heart.bulk(10);ctx.heart.onData({peer:100});ctx.heart.placeMarks();ctx.heart.paint();
ctx.heart.pending=10;ctx.heart.flush();assert.equal(ctx.heart.pending,0);
ctx.heart.reset();assert.equal(burns,1);assert.equal(loves,1);
ctx.heart.wiped();assert.equal(reads,1);
await ctx.admPlantOpen(0);await ctx.admPlantSetStage();await ctx.admPlantReset();
// 執行進房的整段思念／友誼初始化，任何資料操作或解密都會使測試失敗。
const start=src.indexOf('  /* --- 6.2c2 思念'),end=src.indexOf('  /* --- 6.2d 新訊息推播',start);
await vm.runInContext('(async()=>{'+src.slice(start,end)+'})()',ctx);
// 管理員掃描、重查、名冊仍讀取必要資料，但不讀 pet、heart。
const paths=[];
Object.assign(ctx,{get:async path=>{paths.push(path);return{val:()=>null}},ref:(_,path)=>path,db:{},r:{roomId:'fixture'},k:{roomId:'fixture'},base:'rooms/fixture',admCount:async()=>0,query:path=>path,orderByKey(){},limitToLast(){}});
for(const marker of ['const [n, pSnap, newest, mSnap, g2Snap, petSnap, aclSnap]','const [pSnap, mSnap, hSnap, sSnap]']) {
  let from=0;
  while((from=src.indexOf(marker,from))>=0){const to=src.indexOf(']);',from)+3;await vm.runInContext('(async()=>{'+src.slice(from,to)+'})()',ctx);from=to;}
}
assert.ok(paths.length>0);assert.equal(paths.some(path=>/\/(pet|heart|hm)(\/|$)/.test(path)),false);
const nodes=new Map();Object.assign(ctx,{$:id=>{if(!nodes.has(id))nodes.set(id,{hidden:false});return nodes.get(id)},CFG:{},document:{documentElement:{dataset:{}}},paintLoadMore(){},Bond:{applyMode:forbidden}});ctx.Burn.paint=()=>{};
vm.runInContext(src.slice(src.indexOf('function applyRoomMode()'),src.indexOf('/* ── 已讀回條分成兩件事')),ctx);
for(const open of [false,true]){ctx.S.open=open;ctx.applyRoomMode();assert.equal(nodes.get('btnHeart').hidden,true);assert.equal(nodes.get('btnFriend').hidden,true);assert.equal(nodes.get('btnNotes').hidden,false)}
console.log('PASS: disabled extras create no reads, writes, decryptions, timers, observers or listeners; admin avoids extra reads, heart writes stay off, burn/love cleanup and read-position reset remain active.');
