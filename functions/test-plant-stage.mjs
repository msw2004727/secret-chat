import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');const now=1700000000000;let pet={b:now-9000*3600000,a:{one:{n:23,w:now-10}}};const originals=JSON.stringify(pet);let writes=0;
const nodes={paStage:{value:'1'},paApply:{disabled:false},plantAdm:{hidden:true}};
const ctx=vm.createContext({Date:{now:()=>now},S:{offset:0},Adm:{rooms:[{roomId:'room',pet}]},AdmPlant:{i:0},$:id=>nodes[id],toast(){},connect:async()=>({db:{},ref:(_,p)=>p,get:async()=>({val:()=>pet}),set:async(p,v)=>{assert.equal(p,'rooms/room/pet/boost');pet={...pet,boost:v};writes++}})});
vm.runInContext(src.split('\n').filter(l=>/^const PLANT_(EXP_HOUR|EXP_ACT|STEPS|NAMES) =/.test(l)).join('\n'),ctx);
vm.runInContext(src.slice(src.indexOf('async function admPlantSetStage()'),src.indexOf('\nasync function admPlantReset()')),ctx);
const expBody=src.slice(src.indexOf('  exp() {',src.indexOf('const Plant =')),src.indexOf('  stage() {',src.indexOf('const Plant =')));vm.runInContext('globalThis.calc={'+expBody+'};',ctx);
for(let stage=1;stage<=5;stage++){nodes.paStage.value=String(stage);await ctx.admPlantSetStage();const exp=ctx.calc.exp.call({born:pet.b,total:23,boost:pet.boost});assert.equal(exp,[0,120,520,1500,3800][stage-1]);assert.equal(JSON.stringify({b:pet.b,a:pet.a}),originals);}
nodes.paStage.value='99';await ctx.admPlantSetStage();assert.equal(writes,5);
const rules=JSON.parse(fs.readFileSync(new URL('../database.rules.json',import.meta.url),'utf8')).rules.rooms.$roomId.pet.boost['.validate'];for(const admin of [false,true])assert.equal(vm.runInNewContext(rules,{auth:{uid:'u'},root:{child:()=>({val:()=>admin})},newData:{isNumber:()=>true}}),admin);
console.log('PASS: all five stages including lowering mature plants, history preserved, invalid stage rejected, admin-only adjustment.');
