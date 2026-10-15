import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const notes={one:{iv:'encrypted-iv',c:'encrypted-note',t:100},two:{iv:'other-iv',c:'other-note',t:200}};
const makeRoom=()=>({nt:structuredClone(notes),m:{message:{c:'encrypted-message'}},read:{a:'message'},recv:{b:'message'},typing:{a:1},rx:{message:{}},meta:{last:1},heart:{n:3},notice:{c:'notice'},pet:{stage:2}});
for(const entry of ['chat','admin']) {
  const data={rooms:{room:makeRoom(),other:makeRoom()}},operations=[];
  const at=path=>path.split('/').reduce((obj,key)=>obj?.[key],data);
  const remove=async path=>{operations.push(['remove',path]);const parts=path.split('/'),key=parts.pop();delete at(parts.join('/'))[key]};
  const set=async(path,value)=>{operations.push(['set',path]);const parts=path.split('/'),key=parts.pop();at(parts.join('/'))[key]=value};
  const f={db:{},ref:(_,path)=>path,remove,set};
  const S={roomId:'room',msgs:[],notes:structuredClone(notes)};
  const ctx=vm.createContext({ROOM_EXTRAS_ENABLED:false,S,Adm:{rooms:[{roomId:'room',name:'fixture',count:1,last:1}]},...f,base:'rooms/room',mRef:'rooms/room/m',connect:async()=>f,MEDIA_KINDS:[],Watch:{remove(){}},Heart:{wiped(){}},resetList(){},syncWatchUI(){},addSystem(){},toast(){},admRender(){},console});
  if(entry==='chat') {
    vm.runInContext(src.slice(src.indexOf('  S.wipe = async () => {'),src.indexOf('  /* --- 6.6b 正在輸入 ---')),ctx);
    await S.wipe();
  } else {
    vm.runInContext(src.slice(src.indexOf('async function admWipe(i) {'),src.indexOf('\nasync function admGenerate()')),ctx);
    await ctx.admWipe(0);
  }
  assert.deepEqual(data.rooms.room.nt,notes,`${entry}: encrypted notes remain intact`);
  assert.deepEqual(S.notes,notes,`${entry}: local notes remain intact`);
  assert.deepEqual(data.rooms.other,makeRoom(),`${entry}: other room unchanged`);
  for(const key of ['m','read','recv','typing','rx','notice'])assert.equal(data.rooms.room[key],undefined,`${entry}: ${key} still clears`);
  assert.deepEqual(data.rooms.room.heart,makeRoom().heart,`${entry}: disabled heart data remains intact`);
  assert.deepEqual(data.rooms.room.pet,makeRoom().pet,`${entry}: disabled plant data remains intact`);
  assert.equal(data.rooms.room.meta.last,undefined);
  assert.deepEqual(operations[0],['set','rooms/room/meta/wipe']);
  assert.equal(operations.some(([,path])=>path==='rooms/room/nt'||path==='rooms/room'),false);
}
console.log('PASS: chat and admin clear delete conversation data while preserving all encrypted notes, local notes and other rooms; wipe notification remains first.');
