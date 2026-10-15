import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const schema=JSON.parse(fs.readFileSync(new URL('../data/rules.schema.json',import.meta.url)));
test('the published rules schema has no dangling local references',()=>{
 function walk(node){
  if(!node||typeof node!=='object')return;
  if(node.$ref?.startsWith('#/')){
   let target=schema;
   for(const segment of node.$ref.slice(2).split('/')){const key=segment.replaceAll('~1','/').replaceAll('~0','~');assert(target&&Object.hasOwn(target,key),'Unresolved '+node.$ref);target=target[key];}
  }
  Object.values(node).forEach(walk);
 }
 walk(schema);
});
