import {progression,derive,indexPack} from './rules.js';
import {classEntry,isPrestige} from './class-advancement.js';

export function resizeLevelPlan(c,pack,count){
 if(!Number.isInteger(count)||count<1||count>20)throw new Error('Choose a level from 1 to 20');
 const ix=indexPack(pack);
 while(c.levels.length<count){const cls=ix.classes.get(c.levels.at(-1).classId);c.levels.push({classId:cls.id,pendingClass:true,hpRoll:Math.floor(cls.hitDie/2)+1,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});}
 c.levels.length=count;
 if(c.story?.kind==='destiny')c.story.points=Math.min(c.story.points,count);
 c.forcePoints=Math.min(c.forcePoints,derive(c,pack).forceMaximum);
}
export function choosePlannedClass(c,pack,index,id,entry={}){
 if(!Number.isInteger(index)||index<0||index>=c.levels.length)throw new Error('Unknown level');
 const ix=indexPack(pack),cls=ix.classes.get(id);if(!cls)throw new Error('Unknown class');
 const prior=progression(c,pack),ctx=progression(c,pack,index).ctx,l=c.levels[index];
 const draft={...entry,acquisitionDSS:entry.acquisitionDSS??c.darkSideScore};
 const check=classEntry(cls,ctx,ix,draft);if(!check.available)throw new Error(check.reason);
 const different=l.classId!==id||l.pendingClass;
 l.classId=id;delete l.pendingClass;delete l.entryDeclarations;delete l.acquisitionDSS;
 if(isPrestige(cls)){l.entryDeclarations={...draft.entryDeclarations};if(cls.continuousDarkSide)l.acquisitionDSS=draft.acquisitionDSS;}
 if(index&&different)l.hpRoll=Math.floor(cls.hitDie/2)+1;
 const next=derive(c,pack),gained=Math.max(0,next.level-prior.ctx.characterLevel);
 c.forcePoints=gained?next.forceMaximum:Math.min(c.forcePoints,next.forceMaximum);
 if(c.story?.kind==='destiny')c.story.points=Math.min(next.level,c.story.points+gained);
 return next;
}
