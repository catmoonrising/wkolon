export const isPrestige=cls=>cls.classType==='prestige';
export const classMaximum=cls=>cls.maxLevel??20;
export const hasClassTalent=(cls,level)=>cls.talentLevels?cls.talentLevels.includes(level):level%2===1;
export const hasClassBonusFeat=(cls,level)=>cls.bonusFeatLevels?cls.bonusFeatLevels.includes(level):level%2===0;
const sameName=(a,b)=>a.toLocaleLowerCase()===b.toLocaleLowerCase();
export function classRequirement(p,ctx,ix,level,{ignoreDeclarations=false}={}){
 const active=s=>!ctx.inactiveTalents?.has(s.id);
 switch(p.kind){
  case 'any':return p.requirements.some(r=>classRequirement(r,ctx,ix,level,{ignoreDeclarations}));
  case 'level':return (ctx.characterLevel??[...ctx.classLevels.values()].reduce((a,b)=>a+b,0))>=p.min;
  case 'bab':return ctx.bab>=p.min;
  case 'trained':return ctx.trained.has(p.value);
  case 'feat':return ctx.feats.some(s=>sameName(ix.feats.get(s.id).name,p.name)&&(!p.choice||s.choice===p.choice));
  case 'talent':return ctx.talents.some(s=>active(s)&&sameName(ix.talents.get(s.id).name,p.name));
  case 'talentTrees':return ctx.talents.filter(s=>active(s)&&p.values.includes(ix.talents.get(s.id).tree)).length>=p.min;
  case 'forceTalents':return ctx.talents.filter(s=>active(s)&&ctx.forceTalentTrees?.includes(ix.talents.get(s.id).tree)).length>=p.min;
  case 'power':return ctx.forcePowers?.some(s=>sameName(ix.forcePowers.get(s.powerId).name,p.name))||false;
  case 'techniques':return (ctx.classChoices||[]).filter(s=>s.kind==='forceTechnique').length>=p.min;
  case 'droid':return !!ctx.isDroid;
  case 'species':return sameName(ctx.speciesName?.replace(/ \([^)]*\)$/,'')||'',p.name);
  case 'fullDarkSide':return (level.acquisitionDSS??ctx.darkSideScore)===ctx.scores.wis;
  case 'declaration':return ignoreDeclarations||level.entryDeclarations?.[p.value]===true;
  case 'meleeFocus':return ctx.feats.some(s=>ix.feats.get(s.id).name==='Weapon Focus'&&(['simple-weapons','advanced-melee-weapons','lightsabers'].includes(s.choice)||ix.equipment.get(s.choice)?.mode==='melee'));
  default:throw new Error('Unsupported class requirement: '+p.kind);
 }
}
export function classRequirementLabel(p,ix,cls){
 switch(p.kind){
  case 'any':return p.requirements.map(r=>classRequirementLabel(r,ix,cls)).join(' or ');
  case 'level':return 'Level '+p.min;
  case 'bab':return 'Base attack +'+p.min;
  case 'trained':return ix.skills.get(p.value).name+' training';
  case 'feat':return p.name+(p.choice?' ('+(ix.skills.get(p.choice)?.name||p.choice)+')':'');
  case 'talent':return p.name;
  case 'talentTrees':return p.min+' talent'+(p.min===1?'':'s')+' from '+p.values.map(t=>t.slice(5).replaceAll('-',' ')).join(' / ');
  case 'forceTalents':return p.min+' Force talents';
  case 'power':return p.name;
  case 'techniques':return p.min+' Force Technique';
  case 'droid':return 'Droid';
  case 'species':return p.name;
  case 'fullDarkSide':return 'DSS equal to Wisdom';
  case 'declaration':return cls.entrySpecials.find(s=>s.id===p.value).label;
  case 'meleeFocus':return 'Weapon Focus (Melee Weapon)';
 }
}
export function classEntry(cls,ctx,ix,level={},options={}){
 const current=ctx.classLevels.get(cls.id)||0;
 const ban=ctx.classBans?.find(b=>b.classId===cls.id);if(ban&&current>=ban.throughLevel)return {available:false,reason:cls.name+': Known pirate'};
 if(ctx.forbiddenClasses?.includes(cls.id))return {available:false,reason:ctx.speciesName+' cannot be '+cls.name};
 if(current>=classMaximum(cls))return {available:false,reason:cls.name+' maximum level '+classMaximum(cls)};
 if(!current&&isPrestige(cls)&&!ctx.characterLevel)return {available:false,reason:'Choose a heroic starting class'};
 if(current||!isPrestige(cls))return {available:true,reason:''};
 const failed=cls.entryRequirements.filter(p=>!classRequirement(p,ctx,ix,level,options));
 return {available:!failed.length,failed,reason:failed.length?cls.name+': '+failed.map(p=>classRequirementLabel(p,ix,cls)).join('; '):''};
}
export function validateClassAcquisition(l,cls,bad,ix){
 if(l.acquisitionDSS!==undefined&&(!isPrestige(cls)||!Number.isInteger(l.acquisitionDSS)||l.acquisitionDSS<0||l.acquisitionDSS>1000))bad('class acquisition DSS');
 if(l.entryDeclarations!==undefined&&(!isPrestige(cls)||!l.entryDeclarations||typeof l.entryDeclarations!=='object'||Array.isArray(l.entryDeclarations)||Object.entries(l.entryDeclarations).some(([id,v])=>!cls.entrySpecials.some(s=>s.id===id)||typeof v!=='boolean')))bad('class entry declarations');
 if(l.classChoices!==undefined&&(!Array.isArray(l.classChoices)||l.classChoices.length>5||l.classChoices.some(s=>s!==null&&(!s||typeof s.id!=='string'||Object.keys(s).some(k=>!['id','choice','pending'].includes(k))||s.pending!==undefined&&typeof s.pending!=='boolean'||s.choice!==undefined&&typeof s.choice!=='string'||!ix.classChoices.has(s.id)||s.choice!==undefined&&!ix.forcePowers.has(s.choice)))))bad('class feature choices');
}
export function advancementForceBase(cls,pack){return cls.forcePointBase===null?null:cls.forcePointBase??pack.rules.resources.forcePointBase;}

export function recordPrivateerFall(c,d){
 const id='class:master-privateer',level=d.ctx.classLevels.get(id);if(level&&c.darkSideScore>=d.scores.wis&&!c.classBans?.some(b=>b.classId===id)){c.classBans??=[];c.classBans.push({classId:id,throughLevel:level});}
}
export function validateClassBans(c,ix,bad){
 if(c.classBans===undefined)return;
 if(!Array.isArray(c.classBans)||c.classBans.length>1||c.classBans.some(b=>!b||Object.keys(b).sort().join()!=='classId,throughLevel'||b.classId!=='class:master-privateer'||!ix.classes.has(b.classId)||!Number.isInteger(b.throughLevel)||b.throughLevel<1||b.throughLevel>classMaximum(ix.classes.get(b.classId))))bad('class advancement restriction');
}
