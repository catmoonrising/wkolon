// Each check owns its browser context and screenshots. Drain all workers before
// the caller closes the shared browser, including when a check fails.
module.exports=async function runBrowserChecks(checks,jobs=3){
 if(!Number.isInteger(jobs)||jobs<1||jobs>4)throw new Error('WKOLON_BROWSER_JOBS must be an integer from 1 to 4');
 let next=0;const failures=[];
 async function worker(){
  while(next<checks.length){const index=next++,check=checks[index];try{await check.run();}catch(error){failures.push({index,name:check.name,error});}}
 }
 await Promise.all(Array.from({length:Math.min(jobs,checks.length)},()=>worker()));
 if(failures.length){failures.sort((a,b)=>a.index-b.index);throw new AggregateError(failures.map(f=>f.error),'Browser checks failed: '+failures.map(f=>f.name).join(', '));}
};
