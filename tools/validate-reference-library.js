import fs from 'node:fs';
import crypto from 'node:crypto';
import {validateReferenceIndex,validateReferencePage} from '../src/reference-library.js';
import {validateVehicleReferences} from '../src/vehicles.js';
const base=new URL('../',import.meta.url);
const index=validateReferenceIndex(JSON.parse(fs.readFileSync(new URL('data/reference-index.json',base))));
let stockPage=null;
for(const record of index.records){
 const bytes=fs.readFileSync(new URL(record.path,base));
 const hash=crypto.createHash('sha256').update(bytes).digest('hex');
 if(!record.path.endsWith('/'+hash+'.json'))throw new Error('Changed reference file: '+record.name);
 const page=validateReferencePage(JSON.parse(bytes),record,index);if(record.name==='Stock Starships')stockPage=page;
}
validateVehicleReferences(JSON.parse(fs.readFileSync(new URL('data/core.json',base))),index,stockPage);
console.log(`Validated ${index.records.length} pinned reference articles; ${index.pending.length} pending, ${index.excluded.length} excluded`);
