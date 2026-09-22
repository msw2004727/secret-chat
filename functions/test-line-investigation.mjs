import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),clear:()=>m.clear()}};
const sessionStorage=memory(),localStorage=memory();let assigned='',failed=0,entered=0;
const ctx=vm.createContext({HomeSwitch:{unlocked:true,paint(){},required:async()=>true},CFG:{lineChannelId:'test',lineAuthUrl:'https://example.invalid',lineRedirect:'https://sb.02251121.com/',passwords:[{fingerprint:'match',role:'user'}]},S:{needsReload:true},$:()=>({hidden:true}),crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,URL,URLSearchParams,btoa,atob,Date,sessionStorage,localStorage,ACL_STASH:'sc-line-x',window:{},navigator:{userAgent:'iPhone',platform:'iPhone'},location:{assign:u=>assigned=u,reload(){throw Error('Reload during login')}},toast(){failed++},connect:async()=>({auth:{currentUser:{getIdToken:async()=> 'test'}},authMod:{signInWithCustomToken:async()=>{}}}),withTimeout:async p=>p,fetch:async()=>({ok:true,json:async()=>({token:'test',ok:true})}),peelStealth:raw=>({pw:raw}),deriveKeys:async()=>({fingerprint:'match',roomId:'1'.repeat(32)}),tryEnter:async()=>{entered++}});
vm.runInContext(source.slice(source.indexOf('const Acl = {'),source.indexOf('\nconst Push = {'))+'\nglobalThis.Acl=Acl;',ctx);
vm.runInContext(source.slice(source.indexOf('function maybeReload()'),source.indexOf('\nfunction initDisguise()')),ctx);
const a=ctx.Acl;
async function start(){assert.equal(await a.hop('test-room'),'redirected');const u=new URL(assigned);assert.equal(u.searchParams.has('disable_auto_login'),false);ctx.window.__sq='?code=returned&state='+u.searchParams.get('state');return u;}
await start();ctx.maybeReload();sessionStorage.clear();assert.equal(await a.resume(),true);assert.equal(entered,1);assert.equal(failed,0);assert.equal(localStorage.getItem('sc-line-x'),null);assert.equal(a.busy,false);
await start();ctx.window.__sq='?code=returned&state=tampered';await a.resume();assert.equal(entered,1);assert.equal(failed,1);
await start();sessionStorage.clear();const old=JSON.parse(localStorage.getItem('sc-line-x'));old.at-=600001;localStorage.setItem('sc-line-x',JSON.stringify(old));await a.resume();assert.equal(entered,1);assert.equal(failed,2);
ctx.window.__sq='?code=returned&state=missing';await a.resume();assert.equal(failed,3);
ctx.navigator.userAgent='Windows';ctx.navigator.platform='Win32';await a.hop('test-room');assert.equal(new URL(assigned).searchParams.has('disable_auto_login'),false);
console.log('PASS: iPhone App login allowed, cross-tab encrypted recovery with real AES-GCM, wrong-state rejection, expiry, missing session feedback, no mid-login reload, desktop flow unchanged.');
ctx.HomeSwitch.unlocked=false;const oldEntered=entered;await a.hop('',true);ctx.window.__sq='?code=returned&state='+new URL(assigned).searchParams.get('state');await a.resume();assert.equal(entered,oldEntered);assert.equal(ctx.HomeSwitch.unlocked,false);
console.log('PASS: standalone LINE login does not enter a room or unlock homepage protection.');

const beforeMissing=failed;await a.hop('test-room');const returned=new URL(assigned);sessionStorage.clear();localStorage.clear();ctx.window.__sq='?code=returned&state='+returned.searchParams.get('state');await a.resume();assert.equal(failed,beforeMissing+1);console.log('REPRODUCED: callback in browser without original storage cannot complete login.');
const beforeOverlap=failed;await a.hop('test-room');const first=new URL(assigned);await a.hop('test-room');ctx.window.__sq='?code=returned&state='+first.searchParams.get('state');await a.resume();assert.equal(failed,beforeOverlap+1);console.log('REPRODUCED: second login overwrites first login pending state.');