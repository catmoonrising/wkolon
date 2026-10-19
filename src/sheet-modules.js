// View definitions only. Module visibility never changes character mechanics.
export const FEATURE_MODULES=['species-features','feats','talents','class-features','force-techniques','force-secrets','medical-secrets'];
export const MODULES=[
 ['header','Character','wide'],['languages','Languages'],['classes','Classes','wide'],
 ['abilities','Ability Scores'],['defenses','Defenses'],['hp','HP'],['threshold','Damage Threshold','small'],['bab','Base Attack','small'],['speed','Speed','small'],
 ['force','Force Points'],['dark-side','Dark Side Score'],['condition','Condition Track'],['skills','Skills'],['actions','Actions','wide'],['attacks','Attacks'],['force-powers','Force Powers','wide'],['starship-maneuvers','Starship Maneuvers','wide'],['routines','Offensive Routines','wide'],
 ['inventory','Inventory'],['vehicles','Vehicles','wide'],['droid-systems','Droid Systems'],['species-features','Species Features'],['feats','Feats'],['talents','Talents'],['class-features','Class Features'],['force-techniques','Force Techniques'],['force-secrets','Force Secrets'],['medical-secrets','Medical Secrets'],
 ['destiny','Destiny / Background'],['destiny-points','Destiny Points'],['traditions','Force Traditions'],['modifiers','Modifiers'],['notes','Notes'],['house-rules','House Rules','wide'],['dice','Event Log']
].map(([id,title,classes=''])=>Object.freeze({id,title,classes}));
export const moduleDefinition=id=>MODULES.find(m=>m.id===id);
export function moduleRelevant(id,c,d){
 if(id==='vehicles')return !!(c.vehicles?.length||d.ctx.trained.has('skill:pilot'));
 if(id==='droid-systems')return !!(d.ctx.isDroid||d.droidSystems?.enabled||d.droidSystems?.owned.length);
 if(id==='starship-maneuvers')return !!(d.maneuverSlots||c.levels.some(l=>l.starshipManeuvers?.length));
 if(id==='force-powers')return !!(d.powerSlots||d.forcePowers.length);
 if(id==='feats'||id==='talents')return d.ctx[id].length>0;
 if(id==='class-features')return d.ctx.classFeatures.length>0;
 if(['force-techniques','force-secrets','medical-secrets'].includes(id)){const kind={'force-techniques':'forceTechnique','force-secrets':'forceSecret','medical-secrets':'medicalSecret'}[id];return d.ctx.classChoices.some(s=>s.kind===kind);}
 if(id==='destiny')return !!c.story&&c.story.kind!=='none';
 if(id==='destiny-points')return c.story?.kind==='destiny';
 if(id==='traditions')return !!c.forceTraditions?.length;
 return true;
}
export const moduleVisible=(id,visibility,relevant=true)=>Object.hasOwn(visibility,id)?visibility[id]:relevant;
