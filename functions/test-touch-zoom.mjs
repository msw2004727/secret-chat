import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const events=new Map();
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{
  document:{addEventListener(type,handler,options){events.set(type,{handler,options})}},
  location:{search:''},
});
function dispatch(type,fields={}) {
  let prevented=false;
  events.get(type).handler({cancelable:true,preventDefault(){prevented=true},...fields});
  return prevented;
}
assert.equal(dispatch('touchmove',{touches:[{}]}),false);
assert.equal(dispatch('touchmove',{touches:[{},{}]}),true);
assert.equal(dispatch('gesturestart'),true);
assert.equal(dispatch('gesturechange'),true);
assert.equal(dispatch('dblclick',{target:{closest:()=>({id:'gLogo'})}}),true);
assert.equal(dispatch('dblclick',{target:{closest:()=>null}}),false);
for(const type of ['touchmove','gesturestart','gesturechange','dblclick'])assert.equal(events.get(type).options.passive,false);
assert.equal(events.has('click'),false);
assert.equal(events.has('touchend'),false);
console.log('PASS: pinch and logo double-tap defaults blocked before app load; single-finger scrolling, ordinary double-clicks and click/touchend login events preserved.');
