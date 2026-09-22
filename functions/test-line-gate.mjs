import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const block=src.slice(src.indexOf('const Acl = {'),src.indexOf('\nfunction dropAclStash'));
let user=null,admin=false,allowed=false,knocks=0,entered=0,denied=0,failed=0,reply={token:'custom-token',ok:false,admin:false},replaced='',watchValue,watchError,watchOn;
const f={db:{},ref:(_,p)=>p,onValue:(path,on,error)=>{if(path.endsWith('/on'))watchOn=on;else watchValue=on;watchError=error;return()=>{}},auth:{currentUser:{uid:'test-user',getIdToken:async()=> 'test-id-token'}},authMod:{signInWithCustomToken:async()=>{}}};
const ctx=vm.createContext({HomeSwitch:{unlocked:true,paint(){},required:async()=>true},CFG:{passwords:[{fingerprint:'test',role:'user'}],lineAuthUrl:'https://example.invalid',lineRedirect:'https://sb.02251121.com/'},S:{roomId:'rid',subs:[]},leaveChat(){ctx.S.roomId=null;},location:{replace:url=>{replaced=url;}},connect:async()=>f,withTimeout:async p=>p,window:{},URLSearchParams,sessionStorage:{getItem:()=> 'stash'},ACL_STASH:'stash',dropAclStash(){},openWithState:async()=>JSON.stringify({raw:'test',homeUnlocked:true,verifier:'v'.repeat(43)}),peelStealth:raw=>({pw:raw}),deriveKeys:async()=>({fingerprint:'test',roomId:'a'.repeat(32)}),fetch:async()=>({ok:true,json:async()=>reply}),toast:()=>{failed++},realSearch:()=>{throw Error('Password must not be sent to search')},tryEnter:async()=>{if(reply.ok||reply.admin)entered++;else denied++;}});
vm.runInContext(block+'\nglobalThis.Acl=Acl;',ctx);const a=ctx.Acl,realDeny=a.deny;
a.isOn=async()=>true;a.lineUser=async()=>user;a.isAdmin=async()=>admin;a.isOk=async()=>allowed;a.knock=async()=>{knocks++;return "ok";};a.hop=async()=> 'redirected';a.deny=()=>{denied++};
assert.equal(await a.gate('rid','raw'),'redirected');
user={uid:'test-user'};assert.equal(await a.gate('rid','raw'),'denied');assert.equal(knocks,1);
a.knock=async()=> "refresh";assert.equal(await a.gate("rid","raw"),"redirected");a.knock=async()=> "error";assert.equal(await a.gate("rid","raw"),"error");a.knock=async()=> "ok";
allowed=true;assert.equal(await a.gate('rid','raw'),'ok');allowed=false;
admin=true;assert.equal(await a.gate('rid','raw'),'ok');admin=false;
for(const ok of [false,true]){reply={token:'custom-token',ok,admin:false};entered=denied=failed=0;ctx.window.__sq='code=test&state=test';assert.equal(await a.resume(),true);assert.equal(entered,ok?1:0);assert.equal(denied,ok?0:1);assert.equal(failed,0);}
ctx.CFG.passwords[0].role='admin';reply={token:'custom-token',ok:true,admin:false};denied=entered=0;ctx.window.__sq='code=test&state=test';await a.resume();assert.equal(denied,1);assert.equal(entered,0);
reply.admin=true;ctx.window.__sq='code=test&state=test';await a.resume();assert.equal(entered,1);
realDeny.call(a);assert.equal(replaced,'/pending.html');
ctx.S.roomId='rid';denied=0;a.watch(f,'rid');await watchOn({val:()=>true});await watchValue({val:()=>false});assert.equal(denied,1);assert.equal(ctx.S.roomId,null);
ctx.S.roomId='rid';denied=0;admin=true;a.watch(f,'rid');await watchValue({val:()=>false});assert.equal(denied,0);
admin=false;ctx.S.roomId='rid';watchError();assert.equal(ctx.S.roomId,null);
const rules=JSON.parse(fs.readFileSync(new URL('../database.rules.json',import.meta.url),'utf8'));
for(const op of ['.read','.write'])for(const on of [undefined,false,true])for(const test of [
 {label:'anonymous',auth:null,expected:false},
 {label:'firebase-anonymous',auth:{uid:'anon',token:{}},expected:false},
 {label:'unapproved-line',auth:{uid:'line',token:{lp:true}},expected:false},
 {label:'approved-line',auth:{uid:'line',token:{lp:true}},approved:true,expected:true},
 {label:'approved-non-line',auth:{uid:'line',token:{}},approved:true,expected:false},
 {label:'administrator',auth:{uid:'admin',token:{lp:true}},admin:true,expected:true}
]){const root={child:path=>({val:()=>path==='admin/admin'?test.admin===true:path.endsWith('/on')?on:path.endsWith('/ok/line')?test.approved===true:null})};assert.equal(vm.runInNewContext(rules.rules.rooms.$roomId[op],{root,auth:test.auth,$roomId:'a'.repeat(32)}),(test.auth!==null&&on===false)?true:test.expected,op+' '+test.label+' on='+on);}
console.log('PASS: mandatory approval, first/repeat login, admin isolation, same-origin pending redirect, immediate revocation and read failures, 36 database read/write permission cases including legacy switch off/missing.');

a.isOn=async()=>false;assert.equal(await a.gate('rid','raw'),'ok');a.isOn=async()=>null;assert.equal(await a.gate('rid','raw'),'error');
ctx.S.roomId='rid';denied=0;a.watch(f,'rid');await watchOn({val:()=>false});await watchValue({val:()=>false});assert.equal(denied,0);await watchOn({val:()=>true});assert.equal(denied,1);
console.log('PASS: review switch off allows anonymous users, unreadable switch fails closed, enabling review kicks unapproved users.');
// Additional regressions for the anonymous path.
user=null;a.isOn=async()=>false;const before=knocks;assert.equal(await a.gate('rid','raw'),'ok');assert.equal(knocks,before);
ctx.S.roomId='rid';denied=0;f.auth.currentUser.isAnonymous=true;a.watch(f,'rid');await watchOn({val:()=>false});assert.equal(denied,0);await watchOn({val:()=>true});assert.equal(denied,1);
console.log('PASS: review off skips LINE and profile registration; enabling review evicts anonymous session.');
