import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync(new URL('../src/offline.js',import.meta.url),'utf8');
function fixture({hostname='example.test',protocol='https:',supported=true,controller=null,settled=false,readyState='interactive',rejectRegistration=false}={}){
 const document=Object.assign(new EventTarget(),{readyState,documentElement:{dataset:settled?{bootSettled:'true'}:{}}}),sw=Object.assign(new EventTarget(),{controller,register:()=>{calls.register++;if(rejectRegistration)return Promise.reject(new Error('Offline network unavailable'));return Promise.resolve({waiting:null,addEventListener(){}});}}),calls={register:0,reload:0};
 const context={document,navigator:supported?{serviceWorker:sw}:{},location:{hostname,protocol,reload:()=>calls.reload++},console:{warn(){}}};vm.runInNewContext(script,context);
 return {calls,document,sw,settle(){document.documentElement.dataset.bootSettled='true';document.dispatchEvent(new Event('wkolon:boot-settled'));},change(){sw.controller={};sw.dispatchEvent(new Event('controllerchange'));}};
}
test('real offline script defers registration, handles early/late settlement and repeats once',()=>{
 for(const readyState of ['loading','interactive','complete']){
  const f=fixture({readyState});assert.equal(f.calls.register,0);f.document.dispatchEvent(new Event('DOMContentLoaded'));assert.equal(f.calls.register,0);f.settle();f.settle();f.document.dispatchEvent(new Event('DOMContentLoaded'));assert.equal(f.calls.register,1);
 }
 for(const readyState of ['interactive','complete'])assert.equal(fixture({settled:true,readyState}).calls.register,1);
 const early=fixture({readyState:'loading'});early.settle();assert.equal(early.calls.register,0);early.document.dispatchEvent(new Event('DOMContentLoaded'));assert.equal(early.calls.register,1);
});
test('controller observation stays early, first installation preserves page and updates reload once',()=>{
 const existing=fixture({controller:{}});existing.change();existing.change();assert.deepEqual(existing.calls,{register:0,reload:1});existing.settle();existing.change();assert.deepEqual(existing.calls,{register:1,reload:1});
 const first=fixture();first.change();assert.deepEqual(first.calls,{register:0,reload:0});first.settle();first.change();first.change();assert.deepEqual(first.calls,{register:1,reload:1});
 const late=fixture({settled:true,controller:{}});late.change();late.change();assert.deepEqual(late.calls,{register:1,reload:1});
});
test('localhost, insecure and unsupported contexts retain registration and observer exclusions',()=>{
 for(const options of [{hostname:'localhost'},{hostname:'127.0.0.1'},{hostname:'[::1]'},{hostname:''},{protocol:'http:'},{supported:false}]){
  const f=fixture(options);f.settle();f.change();assert.deepEqual(f.calls,{register:0,reload:0});
 }
});

test('failed optional registration is caught and repeated settlement does not retry',async()=>{
 const f=fixture({rejectRegistration:true});f.settle();await new Promise(setImmediate);f.settle();assert.deepEqual(f.calls,{register:1,reload:0});
});
