import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHouseRules,counselingEnabled} from '../src/house-rules.js';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {articleText,renderArticle} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));

test('optional catalog is embedded, folded and searchable by mechanics and sourcebook without changing a character',()=>{
 const c=newCharacter(pack),before=JSON.stringify(c),ui=createHouseRules(pack);ui.setTab('optional');
 const html=ui.render(c);assert(html.includes('Optional Rules'));assert.equal((html.match(/data-optional-rule=/g)||[]).length,pack.optionalRules.entries.length);
 assert(!html.includes('<details open'));assert(!/[\u2014\u00b7]/.test(html));
 ui.searchOptional('wisdom score resist');let filtered=ui.optionalTopics(c);assert(filtered.includes('Resisting the Dark Side'));assert(!filtered.includes('data-optional-rule="optional:daily-force-points"'));
 ui.searchOptional('scavenger manufacturer');filtered=ui.optionalTopics(c);assert(filtered.includes('Droid Manufacturer Traits'));assert(!filtered.includes('data-optional-rule="optional:destiny"'));
 ui.searchOptional('<script>');assert.equal(ui.optionalTopics(c),'<div class="optional-topics"></div>');
 ui.searchOptional('');assert.equal(JSON.stringify(c),before);validateCharacter(c,pack);
});

test('optional sources preserve mechanics, tables and rule links; every automatic entry uses a real shared setting',()=>{
 for(const entry of pack.optionalRules.entries){
  assert(articleText(entry.article).length>30);assert.equal(entry.article.sourceId,entry.source.id);
  assert(new URL(entry.source.url).searchParams.get('oldid')===String(entry.source.revision));
  if(entry.status==='automatic'){assert(entry.counselingId||entry.campaignRuleId);assert(pack.rules.counselingApplications[entry.counselingId]||entry.campaignRuleId==='dailyForcePoints');}
 }
 const quirks=pack.optionalRules.entries.find(r=>r.name==='Droid Quirks');assert(renderArticle(quirks.article).includes('<table>'));
 const daily=pack.optionalRules.entries.find(r=>r.name==='Daily Force Points');assert(articleText(daily.article).includes('Unused Force Points do not carry over'));assert(renderArticle(daily.article).includes('https://swse.miraheze.org/wiki/'));
 const appendage=pack.optionalRules.entries.find(r=>r.name==='Sacrificial Appendage');assert(articleText(appendage.article).includes('retains 1 Hit Point'));assert(!articleText(appendage.article).includes('Salvaging a Destroyed Droid:'));
 const c=newCharacter(pack,{classId:'class:soldier'}),ui=createHouseRules(pack),entry=pack.optionalRules.entries.find(r=>r.name==='Multiple Second Winds');
 ui.setTab('optional');assert(counselingEnabled(c,entry.counselingId));const before=derive(c,pack).recovery.secondWind.daily;
 const el={dataset:{counseling:entry.counselingId},checked:false,hasAttribute:key=>key==='data-counseling'};assert(ui.change(el,c));validateCharacter(c,pack);
 const loaded=JSON.parse(JSON.stringify(c));assert(!counselingEnabled(loaded,entry.counselingId));assert(ui.render(loaded).includes(`data-counseling="${entry.counselingId}" >`));
 ui.setTab('counseling');assert(ui.render(loaded).includes(`data-counseling="${entry.counselingId}" >`));
 // No new parallel optional-rule flag can silently diverge from Counseling.
 assert.deepEqual(Object.keys(loaded.houseRules),['jediCounseling']);assert(before>derive(loaded,pack).recovery.secondWind.daily);
});
