import {WIKI_TAGS,articleText,wikiURL} from './wiki-content.js';

const ID=/^reference:[a-f0-9]{16}$/;
const PATH=/^data\/reference\/[a-f0-9]{64}\.json$/;
export const REFERENCE_KINDS=['reference','species','feat','talentTree','weapon','armor','gear','forcePower','prestigeClass','skill'];
function requireValue(condition,message){if(!condition)throw new Error(message);}
function keys(value,allowed){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));}
function sourceOK(source){
 if(!keys(source,['id','title','revision','timestamp','sha256','url','history']))return false;
 if(!/^source:reference-[a-f0-9]{16}$/.test(source.id)||typeof source.title!=='string'||!Number.isInteger(source.revision)||source.revision<=0||!/^\d{4}-\d\d-\d\dT/.test(source.timestamp)||!/^[a-f0-9]{64}$/.test(source.sha256))return false;
 try{
  const revision=new URL(source.url),history=new URL(source.history);
  return [revision,history].every(url=>url.protocol==='https:'&&url.hostname==='swse.miraheze.org'&&url.pathname==='/w/index.php'&&!url.username&&!url.password)&&revision.searchParams.get('oldid')===String(source.revision)&&history.searchParams.get('title')===source.title&&history.searchParams.get('action')==='history';
 }catch{return false;}
}
export function validateReferenceIndex(index){
 requireValue(keys(index,['schemaVersion','capturedAt','license','records','pending','excluded','candidates'])&&index.schemaVersion===1,'Invalid reference index');
 requireValue(typeof index.capturedAt==='string'&&Number.isInteger(index.candidates)&&index.candidates>=0,'Invalid reference coverage');
 requireValue(keys(index.license,['name','url','attribution','changes'])&&index.license.name==='CC BY-SA 4.0'&&index.license.url==='https://creativecommons.org/licenses/by-sa/4.0/'&&typeof index.license.attribution==='string'&&typeof index.license.changes==='string','Invalid reference attribution');
 requireValue(Array.isArray(index.records)&&Array.isArray(index.pending)&&Array.isArray(index.excluded),'Invalid reference queue');
 const ids=new Set(),names=new Set();
 for(const r of index.records){
  requireValue(keys(r,['id','name','aliases','kind','books','source','path','searchText'])&&ID.test(r.id)&&!ids.has(r.id)&&typeof r.name==='string'&&!names.has(r.name)&&REFERENCE_KINDS.includes(r.kind),'Invalid reference record');
  requireValue(Array.isArray(r.aliases)&&new Set(r.aliases).size===r.aliases.length&&r.aliases.every(a=>typeof a==='string'&&a!==r.name),'Invalid reference aliases');
  requireValue(PATH.test(r.path)&&sourceOK(r.source)&&r.source.title===r.name&&r.source.id==='source:'+r.id.replace(':','-'),'Invalid reference source');
  requireValue(Array.isArray(r.books)&&r.books.length>0&&new Set(r.books).size===r.books.length&&r.books.every(b=>typeof b==='string'&&b.length>0)&&typeof r.searchText==='string','Invalid reference search');
  ids.add(r.id);names.add(r.name);
 }
 requireValue(index.pending.every(r=>keys(r,['title','error'])&&typeof r.title==='string'&&typeof r.error==='string')&&index.excluded.every(title=>typeof title==='string'),'Invalid reference exclusions');
 const excluded=new Set(index.excluded);
 requireValue(index.records.every(r=>!excluded.has(r.name)&&!r.aliases.some(a=>excluded.has(a))),'Homebrew reference excluded');
 return index;
}
export function validateReferencePage(page,record,index){
 requireValue(keys(page,['schemaVersion','id','name','source','article'])&&page.schemaVersion===1&&page.id===record.id&&page.name===record.name,'Wrong reference article');
 requireValue(sourceOK(page.source)&&Object.keys(record.source).every(key=>page.source[key]===record.source[key]),'Changed reference revision');
 const article=page.article;
 requireValue(keys(article,['sourceId','blocks'])&&article.sourceId===record.source.id&&Array.isArray(article.blocks),'Invalid reference article');
 const ids=new Set(index.records.map(r=>r.id));
 function node(n){
  if(typeof n==='string')return;
  requireValue(keys(n,['tag','children','href','referenceId','colspan','rowspan'])&&WIKI_TAGS.has(n.tag)&&Array.isArray(n.children),'Unsafe reference markup');
  if(n.tag==='a')requireValue(wikiURL(n.href)&&(!n.referenceId||ids.has(n.referenceId)),'Invalid reference link');
  else requireValue(n.href===undefined&&n.referenceId===undefined,'Invalid reference attribute');
  for(const key of ['colspan','rowspan'])if(n[key]!==undefined)requireValue(['th','td'].includes(n.tag)&&Number.isInteger(n[key])&&n[key]>=1&&n[key]<=30,'Invalid reference table');
  n.children.forEach(node);
 }
 article.blocks.forEach(node);
 requireValue(articleText(article)===record.searchText,'Changed reference text');
 return page;
}
export function createReferenceLibrary({fetcher=globalThis.fetch,base=new URL('../',import.meta.url)}={}){
 let index=null,pending=null;
 const pages=new Map(),requests=new Map();
 async function get(path){
  const sw=globalThis.navigator?.serviceWorker,controlled=Boolean(sw?.controller);
  const response=await fetcher(new URL(path,base));if(!response.ok)throw new Error('Reference unavailable. Connect and retry.');
  const value=await response.json();
  // A first read can begin before the initial worker claims the sheet.
  if(sw&&!controlled)sw.ready.then(reg=>reg.active?.postMessage({type:'cache-reference',path})).catch(()=>{});
  return value;
 }
 function load(){
  if(index)return Promise.resolve(index);
  if(!pending)pending=get('data/reference-index.json').then(value=>index=validateReferenceIndex(value)).finally(()=>{pending=null;});
  return pending;
 }
 async function article(id){
  await load();
  const record=index.records.find(r=>r.id===id);
  if(!record)throw new Error('Unknown reference.');
  if(pages.has(id))return pages.get(id);
  if(!requests.has(id))requests.set(id,get(record.path).then(value=>{validateReferencePage(value,record,index);pages.set(id,value);return value;}).finally(()=>requests.delete(id)));
  return requests.get(id);
 }
 return {load,article,record:id=>index?.records.find(r=>r.id===id)};
}
