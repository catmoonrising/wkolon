import {FEATURE_MODULES} from './sheet-modules.js';
export const MODULE_LAYOUT_VERSION=2;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const validKey=k=>/^[a-z][a-z0-9-]{0,80}$/.test(k);
const own=(o,k)=>Object.hasOwn(o,k);
export function validatedLayout(d){
 if(!object(d)||!object(d.map)||Object.keys(d.map).length>100)throw new Error('not a layout file');
 for(const [k,p] of Object.entries(d.map))if(!validKey(k)||!object(p)||!['x','y','w'].every(n=>Number.isFinite(p[n])&&p[n]>=0&&p[n]<=1000000)||p.w<32||['h','hc','z'].some(n=>p[n]!==undefined&&(!Number.isFinite(p[n])||p[n]<0||p[n]>1000000)))throw new Error('invalid module position');
 const collapsed=d.collapsed||{},stacks=d.stacks||{},visibility=d.visibility||{};
 if(![undefined,1,2].includes(d.moduleVersion))throw new Error('unsupported module layout version');
 if(!object(collapsed)||!object(stacks)||!object(visibility)||Object.entries(collapsed).some(([k,v])=>!validKey(k)||typeof v!=='boolean')||Object.entries(visibility).some(([k,v])=>!validKey(k)||typeof v!=='boolean')||Object.keys(visibility).length>100||Object.keys(stacks).length>100)throw new Error('invalid module preferences');
 const assigned=new Set();
 for(const st of Object.values(stacks)){
  if(!object(st)||!Array.isArray(st.members)||st.members.length>100||!st.members.every(validKey)||typeof st.active!=='string'||!st.members.includes(st.active)||new Set(st.members).size!==st.members.length||st.members.some(k=>assigned.has(k)))throw new Error('invalid module stack');
  st.members.forEach(k=>assigned.add(k));
 }
 return structuredClone({moduleVersion:d.moduleVersion??1,free:!!d.free,activated:!!d.activated,grid:Math.max(1,Math.min(64,Number(d.grid)||16)),snapGrid:d.snapGrid!==false,snapEdge:d.snapEdge!==false,zTop:Math.max(0,Math.min(1000000,Number(d.zTop)||0)),map:d.map,collapsed,stacks,visibility});
}
export function migrateModuleLayout(input){
 const d=validatedLayout(input);if(d.moduleVersion===MODULE_LAYOUT_VERSION)return d;
 function split(old,ids,retained=false){
  const claimed=new Set(Object.values(d.stacks).flatMap(s=>s.members).filter(k=>k!==old));
  const inherited=ids.filter(id=>!own(d.map,id)&&!claimed.has(id));
  for(const id of inherited)if(own(d.map,old))d.map[id]={...d.map[old]};
  for(const id of ids){if(own(d.collapsed,old)&&!own(d.collapsed,id))d.collapsed[id]=d.collapsed[old];if(own(d.visibility,old)&&!own(d.visibility,id))d.visibility[id]=d.visibility[old];}
  const replacement=[...(retained?[old]:[]),...inherited];
  const stack=Object.values(d.stacks).find(s=>s.members.includes(old));
  if(stack){stack.members=stack.members.flatMap(k=>k===old?replacement:[k]);if(stack.active===old&&!retained)stack.active=replacement[0]||stack.members[0];}
  else if(own(d.map,old)&&replacement.length>1){let key='split-'+old,n=1;while(own(d.stacks,key))key='split-'+old+'-'+n++;d.stacks[key]={members:replacement,active:replacement[0]};}
  if(!retained){delete d.map[old];delete d.collapsed[old];delete d.visibility[old];}
 }
 // Only transform a legacy Features placement/group; fresh flow remains separate.
 if(own(d.map,'features')||own(d.collapsed,'features')||own(d.visibility,'features')||Object.values(d.stacks).some(s=>s.members.includes('features')))split('features',FEATURE_MODULES);
 if(own(d.map,'header')||Object.values(d.stacks).some(s=>s.members.includes('header')))split('header',['languages','destiny','destiny-points','traditions'],true);
 for(const [id,s]of Object.entries(d.stacks))if(s.members.length<2)delete d.stacks[id];
 d.moduleVersion=MODULE_LAYOUT_VERSION;return validatedLayout(d);
}
