import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const records=new Map();
const indexedDB={open(){const request={};queueMicrotask(()=>{
  request.result={createObjectStore(){},close(){},transaction(){
    const tx={};
    tx.objectStore=()=>Object.fromEntries(['get','put','delete'].map(method=>[method,(value,key)=>{
      const op={};queueMicrotask(()=>{
        if(method==='put'){records.set(key,structuredClone(value));op.result=key}
        else if(method==='get')op.result=structuredClone(records.get(value));
        else records.delete(value);
        tx.oncomplete?.();
      });return op;
    }]));return tx;
  }};request.onsuccess?.();
});return request}};
const nodes=new Map();const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,open:false,textContent:'',events:{},addEventListener(k,f){this.events[k]=f},showModal(){this.open=true},close(){this.open=false;this.events.close?.()}});return nodes.get(id)};
const links=[{events:{},addEventListener(k,f){this.events[k]=f}},{events:{},addEventListener(k,f){this.events[k]=f}}];
let now=0,entered=[],target,derive;
const ctx=vm.createContext({$,indexedDB,crypto:webcrypto,enc:new TextEncoder(),TextDecoder,Uint8Array,setTimeout,clearTimeout,Date:{now:()=>now},HomeSwitch:{unlocked:false,quickEntry:false},ENTER_MARK:',',CFG:{passwords:[]},document:{querySelectorAll:()=>links},peelStealth:raw=>({pw:raw.slice(0,-1)}),deriveKeys:async password=>derive?await derive:({fingerprint:password==='2468'?target:'other'}),tryEnter:async raw=>{assert.equal(ctx.HomeSwitch.quickEntry,true);entered.push(raw)},toast(){}});
vm.runInContext(src.slice(src.indexOf('const TERMS_ROOM_FINGERPRINT ='),src.indexOf('\nfunction initGate()'))+';globalThis.store=TermsShortcutStore;globalThis.terms=TermsEntry;globalThis.quick=QuickEntry;globalThis.target=TERMS_ROOM_FINGERPRINT;',ctx);
target=ctx.target;ctx.CFG.passwords=[{fingerprint:target,role:'room-test'},{fingerprint:'other',role:'other-room'}];
const {store,terms,quick}=ctx;
assert.equal(await store.load(),null);await store.save('2468');assert.equal(await store.load(),'2468');
assert.equal(records.get('room').key.extractable,false);await assert.rejects(()=>webcrypto.subtle.exportKey('raw',records.get('room').key));
const old=structuredClone(records.get('room'));new Uint8Array(records.get('room').ct)[0]^=1;await assert.rejects(()=>store.load());records.set('room',old);
quick.init();terms.init();
const tap=()=>{let prevented=false;links[0].events.click({preventDefault(){prevented=true}});assert.equal(prevented,true);now+=100};
tap();tap();tap();tap();await new Promise(setImmediate);assert.equal(entered.length,0);tap();await new Promise(setImmediate);await new Promise(setImmediate);assert.deepEqual(entered,['2468,']);assert.equal(ctx.HomeSwitch.quickEntry,false);assert.equal(ctx.HomeSwitch.unlocked,false);
await $('quickRoomForget').events.click();assert.equal(await store.load(),null);
await terms.start();assert.equal($('quickRoomDialog').open,true);assert.equal(quick.mode,'terms');
quick.buf='1111';await quick.submit();assert.equal(await store.load(),null);assert.equal(entered.length,1);assert.match($('quickRoomSub').textContent,/指定房間/);
quick.buf='2468';await quick.submit();assert.equal(await store.load(),'2468');assert.equal(entered.length,2);assert.equal($('quickRoomDialog').open,false);
quick.open();await terms.paintForget();assert.equal($('quickRoomForget').hidden,false);await $('quickRoomForget').events.click();quick.close();assert.equal(await store.load(),null);
quick.open('terms');quick.buf='2468';let resolve;derive=new Promise(r=>resolve=r);const pending=quick.submit();quick.close();resolve({fingerprint:target});await pending;derive=null;assert.equal(await store.load(),null);assert.equal(entered.length,2);
const save=store.save;let finishSave;const saving=new Promise(r=>finishSave=r);
store.save=async password=>{await saving;await save.call(store,password)};
quick.open('terms');quick.buf='2468';const cancelledSave=quick.submit();await new Promise(setImmediate);quick.close();finishSave();await cancelledSave;
store.save=save;assert.equal(await store.load(),null);assert.equal(entered.length,2);
const access=store.access;store.access=async()=>{throw Error('storage unavailable')};
quick.open('terms');quick.buf='2468';await quick.submit();assert.equal(entered.length,2);assert.match($('quickRoomSub').textContent,/無法設定/);quick.close();store.access=access;
// 間隔太久不能累計五次；一般三連點入口仍不記住任何房間。
tap();tap();tap();tap();now+=2000;tap();await new Promise(setImmediate);assert.equal($('quickRoomDialog').open,false);
quick.open();quick.buf='2468';await quick.submit();assert.equal(await store.load(),null);
assert.equal(src.slice(src.indexOf('const TERMS_ROOM_FINGERPRINT ='),src.indexOf('\nfunction initGate()')).includes('AutoLocation'),false);
console.log('PASS: real AES-GCM local credential round trip, nonexportable key, tamper rejection, five-tap timing, designated-room-only setup, clear/resetup, cancellation while deriving/saving, storage failure closed, ordinary entry never persists, no location report or homepage unlock.');
