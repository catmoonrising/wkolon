const flags=['ignoreDR','spendForcePoint','energy','sonic','fire','cold','electrical','lightsaber','otherDamage','requiresUseTheForce'];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function incomingDamageDeclaration(value){
 if(!object(value)||Object.keys(value).some(k=>!['amount','options'].includes(k))||!Number.isInteger(value.amount)||value.amount<0||value.amount>1000000000)throw new Error('Enter incoming damage');
 const source=value.options===undefined?{}:value.options;
 if(!object(source)||Object.keys(source).some(k=>!['type','against','conditionSteps',...flags].includes(k)))throw new Error('Invalid incoming damage declaration');
 const options={type:source.type===undefined?'normal':source.type,...(source.conditionSteps!==undefined?{conditionSteps:source.conditionSteps}:{}),...Object.fromEntries(flags.map(k=>[k,source[k]===undefined?false:source[k]])),against:source.against===undefined?[]:source.against};
 if(source.conditionSteps!==undefined&&(!Number.isInteger(source.conditionSteps)||source.conditionSteps<0||source.conditionSteps>5))throw new Error('Invalid Condition Track steps');
 if(!['normal','stun','ion'].includes(options.type)||flags.some(k=>typeof options[k]!=='boolean')||!Array.isArray(options.against)||options.against.length>20||new Set(options.against).size!==options.against.length||options.against.some(k=>typeof k!=='string'||!k||k.length>100))throw new Error('Invalid incoming damage declaration');
 return {amount:value.amount,options:{...options,against:[...options.against]}};
}
export function readDamageForm(form){
 const checked=name=>!!form.querySelector('['+name+']')?.checked;
 return incomingDamageDeclaration({amount:Number(form.querySelector('[data-incoming-damage]').value),options:{type:form.querySelector('[data-damage-type]').value,ignoreDR:checked('data-ignore-dr'),spendForcePoint:checked('data-survive-fp'),energy:checked('data-damage-energy'),sonic:checked('data-damage-sonic'),fire:checked('data-damage-fire'),cold:checked('data-damage-cold'),electrical:checked('data-damage-electrical'),lightsaber:checked('data-damage-lightsaber'),otherDamage:checked('data-damage-other'),against:[...form.querySelectorAll('[data-damage-context]:checked')].map(el=>el.dataset.damageContext)}});
}
