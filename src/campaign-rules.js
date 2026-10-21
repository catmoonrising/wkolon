// User-supplied campaign rules. Published wiki articles remain unchanged.
export const CAMPAIGN_RULES=[
 {id:'plannedGeneration',name:'Planned Generation (25 points)',text:'Use Planned Generation with 25 points.',support:'Automatic'},
 {id:'averageHP',name:'Average Hit Points',text:'Use average Hit Points, rounded up, after 1st level. First-level Hit Points remain the class maximum.',support:'Automatic'},
 {id:'averageCredits',name:'Average starting credits',text:'Use the average of the starting class’s credit roll.',support:'Automatic'},
 {id:'scalingSkillFocus',name:'Skill Focus',text:"Skill Focus adds a competence bonus equal to one-half the character's level rounded up, instead of a competence bonus of +5.",support:'Automatic'},
 {id:'legalReprogram',name:'Reprogram',text:'Reprogramming a droid must result in a legal build that’s achievable without using Reprogram.',support:'Manual'},
 {id:'playerDarkSide',name:'Dark Side characters',text:'A character whose Dark Side Score equals their Wisdom score does not become a GM character; the player may continue playing the Dark Side character.',support:'Manual'},
 {id:'dailyForcePoints',name:'Daily Force Points',optionalId:'optional:daily-force-points',support:'Automatic'},
];
export const campaignRuleEnabled=(c,id)=>c.houseRules?.campaign?.[id]===true;
export const averageHPAmount=die=>Math.ceil((die+1)/2);
export const startingCreditAverage=cls=>cls.credits.dice*(cls.credits.sides+1)/2*cls.credits.multiplier;
export const dailyForceMaximum=(level,boon=false)=>level>0?Math.min(4,Math.ceil(level/5))+(boon?1:0):0;
export const forcePoolAfterAdvancement=(c,next,{gained=false,first=false}={})=>campaignRuleEnabled(c,'dailyForcePoints')&&!first?Math.min(c.forcePoints,next.forceMaximum):gained?next.forceMaximum:Math.min(c.forcePoints,next.forceMaximum);
