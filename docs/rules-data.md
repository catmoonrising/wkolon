# Rules data contract (version 1)

This contract was written before the calculation engine. The browser consumes a
reviewed static `data/core.json` pack. It never interprets wiki prose as code.
Character files store choices and play state, not calculated totals.

Protection and attack sequences follow the [combat data contract](combat.md).

Book-specific species are separate records with `bookVariant` and distinct IDs.
Their articles retain common characteristics and only the selected book's traits.
`conditionalFocuses` supports multiple independent training-dependent grants.
`forceImmune` forbids Force Sensitivity and Use the Force, yields no Force Points,
and retains immunity to Force effects targeting Will as a manual defensive trait. `technophobic` is an attack
and mechanical-tool check penalty, not a penalty to all checks.

Optional `houseRules: {jediCounseling: {topicId: boolean}, comlinkUpgradeFees:
boolean}` is saved with the character. Counseling switches default on, including
older characters with no saved switch; an explicit `false` stays off. Imported
topics retain complete pinned text; only explicitly supported calculations change.
An explanation that already follows RAW does not invent a different off-state.
Comlink functionality fees default to the user's requested interpretation: base
price plus each option's full base-price fee. With it off, quoted price multipliers multiply; the source itself does not
settle combinations. Miniaturization doubles the base device cost in either mode.

Equipment may have a `family`, `variant`, `upgrades`, `availability` and
`biotech` flag. Inventory retains a concrete variant ID plus optional `options`,
`armorSize`, `weightOverride`, `mechanical`, and `licenseStatus`.
`mechanicalSkills` identifies checks currently using mechanical tools. Grouped purchasing resolves
these choices before debiting credits. A `null` cost means Add owned only; it is
never a free purchase. Armor cost and weight scale by fitted size. Licensing uses
the Equipment table's percentage of normal item cost, separately from any market
surcharge. Paying an application fee does not automatically approve the license.
Miniaturized Comlink weight is unspecified; a weight override can supply it.

Armor movement uses `rules.armorMovement: {sourceIds, speedMultipliers,
runMultipliers}`. The reviewed Equipment page supplies Light ×1, Medium/Heavy
×0.75 (rounded down), and running ×4 except Heavy ×3. Proficiency does not
remove movement limits. Apply armor to each movement speed, then the Condition
Track's half-speed penalty; running uses the resulting normal speed. Carrying
limits remain manual, so this running value does not include a Heavy Load.

Armor may declare `abilityBonuses: {str: 2}`. Only Strength is currently supported,
for the reviewed Corellian Powersuit. Apply it only while equipped and proficient,
after permanent/species/level scores; it affects checks, melee attacks and damage.
Saved base scores and the chronological advancement ledger remain unchanged.
No currently enabled feat has a Strength prerequisite. Future Strength-prerequisite
feats must also handle temporary prerequisites and losing access when gear is removed.
Life-support durations and supplemental upgrade slots remain in the complete
embedded articles; they do not create automatic resource pools.

## Pack

`schemaVersion`, `id`, `version`, `name`, `license`, `sources`, `rules`, and arrays
`species`, `classes`, `skills`, `feats`, `talents`, `equipment` are required.
Each record has a stable, namespaced `id`, `name`, and `sourceId`. Sources contain
wiki title, permanent revision URL, revision ID, timestamp, and history URL.
IDs do not depend on display labels. Characters pin a pack ID and version.

- **Rules:** point-buy costs and budget, standard array, feat/ability milestones,
  skill training/focus bonuses, armor penalties, size modifiers and condition penalties.
- **Species:** ability adjustments, size, speed in squares, automatic languages,
  bonus feat/skill counts, unconditional defense bonuses, conditional skill focus,
  and concise trait reminders. Optional `isDroid: boolean` defaults to `false`
  and selects the Condition Track terminal label: `Helpless (Disabled)` for a
  droid, `Helpless (Unconscious)` otherwise. This classification does not
  implement droid construction or other droid mechanics.
  Optional `naturalArmor` stacks with worn armor; it does not replace the level
  bonus. `conditionalDefenses: [{defense: "will", against: "use-the-force",
  amount: 5, type: "untyped"}]` adds a separate situational total, never a global
  defense bonus. `rules.sizeStealth` contains Small +5, Medium 0 and Large −5.
  Optional `speeds` retains movement types such as swimming; the sheet and stat
  block display them and Condition Track reductions apply to each speed.
- **Classes:** explicit BAB table for class levels 1–20, hit die, starting HP,
  starting trained skill count, class skill IDs, defense bonuses, starting feat IDs,
  permitted bonus feat IDs, talent tree IDs, starting credit dice and multiplier.
- **Skills:** key ability, trained-only flag and armor-check flag. Each Knowledge
  specialty is its own skill.
- **Feats / talents:** prerequisite expression, repeatability (`never`, `choice`,
  `stack`), optional choice (`skill`, `weaponGroup`), `effects`, and `reminder`.
  Talent records also identify class-accessible trees. Combat conditions remain
  reminders until the engine explicitly supports them.
- **Equipment:** kind (`weapon`, `armor`, `gear`), cost in credits and kg weight.
  Weapons add group, size, mode, damage dice and damage type. Armor adds category,
  armor bonus, Fortitude equipment bonus, max Dexterity bonus and skill effects.

## Finishing fields

Optional Destiny, Background and Heroic Traits data and saved selections follow
the [finishing data contract](heroic-traits.md). Old character files remain valid.

## Embedded references

Any record may include `reference: [{heading, text, sourceId}]`. Each entry is
plain text with a short heading and mechanics tied to a reviewed, pinned source.
These entries supplement the typed calculation fields; they never drive
calculations or contain HTML. The sheet renders bundled stats, prerequisites and
existing reminders locally in collapsed disclosures. Source links remain in
Rules. The [feat and talent browser](feature-trees.md) uses prerequisite graphs and complete
pinned wiki articles. Remaining creation work is tracked in `TODO.md`; generated
summaries do not replace these articles.

## Prerequisites and effects

Prerequisites use a closed JSON vocabulary: `all`, `any`, `ability` with `min`,
`feat`, `talent`, `trained`, `bab` with `min`, `classSkill`, `untrained`,
`proficientChoice`, `focusChoice`, `nonDroid`. A `$choice` target binds to the record's choice.
Evaluate against the character **before** granting that selection. Unknown
expressions are errors, never silently eligible.

Effects use `target`, `amount`, `type`, optional `perLevel`. Supported targets:
`defenses`, `hp`, `threshold`, `skillFocus`, `skillTraining`, `weaponFocus`,
`weaponSpecialization`. Unsupported effects cannot be marked automated.
Skill Focus competence bonuses use the highest value, not their sum.
Armor and class defense rules have explicit engine operations, not additive effects.
No JavaScript, HTML, eval, or expression strings are permitted in packs.

## Character and level ledger

`schemaVersion: 1`, `ruleset: {id, version}`, identity, species ID, base abilities,
ability generation method, initial trained skill IDs, purchased inventory, current
HP/Force Points/credits/condition, notes, numeric modifiers, and an ordered `levels`
array. Each level contains class ID, HP die result, feat choices, talent choice,
one multiclass starting feat when applicable, and two different ability increases
on every fourth heroic level. Selection entries are `{id, choice?, pending?}`. `pending: true` records a
chosen feat family awaiting its subtype; it grants no effect. Existing concrete
feat IDs remain unchanged. Ability-generation drafts may store
`abilityGeneration: {pool: number[], assign: {str, dex, con, int, wis, cha}}`.
Assignments are pool indexes or `null`; indexes are unique, even when rolled
values are equal. An unassigned base score is temporarily 10. Validation checks
pool/score consistency and reports missing assignments. Older files infer pool
assignments from their existing scores. Manual input saves only valid integers
without rebuilding the focused input.

Chronological validation prevents future feats/talents satisfying past
prerequisites. Replaying the ledger derives class levels, BAB, feats, talents and
ability increases. Constitution and Intelligence increases apply retroactively.
Multiclassing grants one starting feat and expands class skills, not the original
class's starting trained-skill count. Drafts may have missing choices; invalid
choices are reported and excluded from calculations.

## Extraction

1. Discover actual category membership through MediaWiki `categorymembers`, with
   continuation and recursive subcategory traversal; do not assume menu pages are categories.
2. Fetch batches of at most 50 titles through `query` + `revisions`, `rvslots=main`,
   `rvprop=ids|timestamp|sha1|content`, `redirects=1`, `maxlag=5`. Keep requested
   aliases, canonical titles, page IDs, revision IDs, timestamps and checksums.
3. Keep raw snapshots in `.build/` (ignored). XML from `Special:Export` is an
   equivalent offline intake, including templates where needed. Talent links
   frequently redirect to a section of a tree; retain that section in provenance.
4. Normalize predictable tables/templates into candidates. Review prerequisites,
   timing, stacking, conditional abilities, errata and book attribution separately.
   Missing/ambiguous fields stay on the review queue, never become inferred rules.
5. Compile only reviewed records; validate references and calculations in CI.
   A changed source revision goes back to review before updating an existing pack.

`tools/import-wiki.py` discovers the intersection of Core Rulebook membership
with species, feats, talent trees, weapons, armor, general equipment, Force powers
and prestige classes. Skills and the five heroic classes are captured explicitly.
Continuation is followed; redirects and section identities are retained. Parsing
uses revision IDs, not whatever revision happens to be current during an import.
Core talent records come only from Core Talents headings. Complete tree pages
still contain their labeled Additional sections. Category membership alone does
not resolve different published species variants or errata.
Species feat names come from the first column of their table, with their complete
articles bundled for local disclosures. Supplemental species feats remain
reference-only until their prerequisites and effects have been reviewed.

Three committed files have distinct roles:

- `data/wiki-catalog.json`: imported, sanitized articles, library records, source
  revisions, SHA-256 wikitext checksums and contributor histories. No executable
  mechanical inference. Full articles retain wording, tables and wiki links.
- `data/mechanics.json`: reviewable, declarative calculation mappings using the
  typed fields above. Calculations no longer live in the Python compiler.
- `data/core.json`: generated browser pack, combining both. Rebuild offline with
  `python3 tools/compile-core.py`. The compiler checks
  `tools/reviewed-revisions.json` and refuses changed revisions for existing
  mechanical mappings. Additive reference imports keep the character pack version
  unchanged; a future incompatible mechanical change requires migration. The
  compiler associates newly reviewed options with catalog entries by name or
  exact source title, revision and section, without another reference import.

`catalog: {schemaVersion: 1, book, records}` supplements the pack. Catalog entries
have stable `id`, `name`, `kind`, `sourceId`, `ruleId`, `books`, `status`, and optional
`tree`, `classIds`, and a `mechanicsIds` array. `ruleId` resolves to an embedded `rulePages`
article; its source must match `sourceId`. Status is `available` only when a
builder option exists, otherwise `reference`. Variant pages may have several
mapped options. It does not mean every variant or all situational
effects are automated. Imported reference text grants no effects or eligibility.
Rules searches names and complete article text, with type and builder filters.

The imported library has 485 entries: 23 species, five heroic classes, twelve
prestige classes, nineteen skill pages (Knowledge contains seven fields), 64 feat
pages (including Weapon Proficiency), 200 Core talents, forty talent trees,
48 weapons, eleven armor entries, 46 general equipment pages, and seventeen Force
powers. The reviewed builder covers all 23 species and eleven armor entries,
plus a smaller feat, talent and remaining equipment subset. Read [import-review.md](import-review.md) for actual source
conflicts, unresolved variants and remaining mechanical work.

`tools/wiki-extract.py` remains available for resumable extraction and XML intake.

The wiki API advertises CC BY-SA 4.0 for wiki contributions. Preserve source
attribution and revision/history links, mark adaptations, and keep data attribution
separate from application code. The pack contains numeric mechanics, short original reminders, and complete species
and species feat wiki articles converted without artwork or executable markup.
[Species selection](species-selection.md) defines that presentation format and its
revision-pinned extraction pipeline. The wiki's license
statement alone does not establish ownership of underlying publisher material.

API documentation: https://www.mediawiki.org/wiki/API:Revisions and
https://www.mediawiki.org/wiki/API:Categorymembers.

## Counseling and licenses

`jediCounseling` contains `{id, name, issue, sourceId, ruleId}` topics extracted
from the pinned Saga Counseling tabs (105–115). `rules.counselingApplications`
is an explicit reviewed allowlist of executable applications. Other topics are
saved manual rulings. The compiler checks the source revision for each supported
application, as it does for species and other mechanical records.

`rules.licensing` has `sourceIds` and four `ratings`: `licensed`, `restricted`,
`military`, `illegal`. Each stores `{percent, blackMarket, dc, days}` from the
published table. Inventory license states are `none`, `pending`, `approved`,
`denied`. Application payment sets `pending`; ownership never implies approval.
Credits allow fractional values so fitted armor/license costs do not introduce
an unprinted rounding rule. Existing inventory without `armorSize` stays Medium.
