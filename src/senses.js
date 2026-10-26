// A summary of existing calculations; rendering never changes character state.
export function sensesView(d){
 const name=d.blind?'Blinded':({normal:'Normal Vision','low-light':'Low-Light Vision',darkvision:'Darkvision'}[d.vision||'normal']||'Unknown');
 return `<span>${name}</span>${d.scentRange?`<div>Scent ${d.scentRange} squares</div>`:''}`;
}
