import {escapeHTML as escape} from './wiki-content.js';
export function automationBadge(record){
 const status=record?.automation;if(!status)return '';
 const title=status==='manual'?'Effects handled manually':'Some effects automated; review full rules';
 return `<span class="automation-badge" title="${title}">${status==='manual'?'Manual':'Partial'}</span>`;
}
