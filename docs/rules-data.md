# Rules data contract (version 1)

This contract was written before the calculation engine. The browser consumes a
reviewed static `data/core.json` pack. It never interprets wiki prose as code.
Character files store choices and play state, not calculated totals.

`tools/discover-books.py` captures all Reference Books category memberships and
the complete recursive Homebrew exclusion tree. It produces a title/status review
queue under `.build/` and [the coverage report](wiki-coverage.md). A page with a
reviewed mapping is only partially covered until all of its rules are reviewed.
`tools/import-wiki.py` reuses a captured recursive exclusion list, including for
linked species feats and redirects. Offline imports require that list; missing
category captures and embedded Homebrew fail rather than silently importing it.

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

`src/creation-options.js` binds each class/skill preview to its imported catalog
`ruleId` and that article's own pinned `sourceId`. Knowledge fields share the
Knowledge article. Skill mechanical records that use the generic Skills source
retain that provenance; showing a more detailed article does not reauthorize
calculations. Previews reuse original document nodes, with the complete article
available locally. Class previews omit the large progression table; skill previews
put Applications behind a disclosure, preserving supplementary section labels.

## Prerequisites and effects

`rules.forceTalentAccess` pins the four Core Force trees and their access sources.
An earned Force Sensitivity feat permits these trees in any existing talent slot;
it creates no additional slot and is required even with Counseling disabled.
Dark Side talents require `darkSideScore >= 1`. Their selections retain
`darkSideScore` at acquisition; replay verifies historical prerequisites using
that value. Current DSS 0 suspends the talents without discarding ownership.
Inactive talents cannot supply current prerequisites or effects.

`forcePowers` contains reviewed, pinned power records with action and descriptor
IDs; articles retain complete original mechanics. Force Training declares
`forcePowerSlots: {amount: 1, ability: "wis", minimum: 1, type: "untyped"}`.
Each earned instance initially contributes `max(1, 1 + permanent WIS modifier)`
slots. Each later permanent modifier increase adds one slot per previously earned
instance, even when both the old and new modifiers are negative. Replay retains
this chronological capacity rather than recalculating it from current Wisdom.
Level entries may retain `forcePowers: [{id, powerId, spent}]`; duplicate powers
are allowed, but copy IDs are unique. New choices are replayed after that level's
feats and before its talent, so later learning cannot meet an earlier power
prerequisite. Permanent WIS increases grant capacity for every earned instance.

`rules.forcePowerRecovery` pins the suite rules: rest after combat (1 minute),
natural 20 recovery at the end of the turn, and spending 1 Force Point to recover
one power. Optional `forcePowerRecoveryPending` records pending turn-end recovery.
Use consumes a copy even on a failed check; generic Use the Force rolls do not
trigger recovery. Dark Side descriptor use increments DSS, capped at WIS.
Target effects, maintained durations and special Force Point enhancements remain
manual. Recovery buttons assert the timing described in their source text.

Force Perception grants Perception training, but its substitution is conditional
on `when: "perceptionApplications"`; selecting it asserts that the check is for
Avoid Surprise, Notice Targets, Sense Deception or Sense Influence. Its selector
and calculation disclosure retain those names. Other Perception checks use the
native modifier by default. Force Pilot is an unconditional substitution.

Features may specify `maxSelections` for an expressly capped repeatable talent.
`repeatGroup` identifies the same talent across class-tree records; `weaponGroup`
binds a fixed specialization. Jedi and Soldier Weapon Specialization therefore
share the once-per-group limit. Fixed lightsaber specialization applies only to
melee damage, as its source says. `forceActivation` distinguishes `check` and
`forcePoint`; the existing Counseling switch controls both restrictions.

`skillSubstitution` is a separate closed effect shape: `{target, skill,
replacement, grantsTraining, when?}`. Force Intuition and Force Persuasion grant
training in their destination skill immediately during chronological replay,
before later prerequisites. The chosen check uses the replacement's complete
modifier, without adding the destination's training, focus or penalties again.
Unconditional substitutions default to the better available modifier. Trace has
`when: "computerNetwork"` and defaults to the native skill; choosing the network
option asserts access for that check. Neither substitution invents skill training
in the replacement skill. Reroll actions remain manual.

Optional character `skillCheckSources` maps skill IDs to another known skill ID
or the native skill ID. Only currently earned, available substitutions can affect
checks; stale saved preferences fall back to the native skill. The sheet exposes
a selector only when a replacement is currently available.

Connections declares `licenseAllowance` (1,000 credits per character level) and
`blackMarketReduction` (1). Purchase quotes receive only earned, reviewed effects.
The allowance checks the complete quantity's market price before licensing fees;
eligible normal/offworld purchases waive fees and background checks. Black-market
quotes reduce the multiplier independently of the allowance. Connections never
supplies a market price for an owned-only item. Other talents' temporary bonuses,
actions, per-day uses, Knowledge applications and starship effects remain manual.

Scout/Soldier passive talents use the closed effect targets `armorMaxDex`,
`armorBonus`, `armorFortitude`, `armorMovement`, `speed` and `meleeDamage`.
Each carries an explicit `when`: `proficientArmor`, `lightOrNoArmor` or
`meleeAttack`. Armor adjustments occur before Armored Defense comparisons;
movement adjustments occur before armor reduction and Condition Track halving.
Juggernaut's `armorMovement: 1` removes armor's speed and running restrictions,
with proficiency required. Long Stride changes natural movement speeds only.
No equipment record or base score is rewritten. Other attack procedures, rerolls,
ally bonuses and condition changes remain manual, with verbatim rules retained.
Class `talentAccessSourceId` pins the reviewed Core tree list independently of
the class article and individual talent sections.

`rules.ambiguities` contains stable IDs, names, pinned source/rule IDs, enumerated
options and a default option. Character `houseRules.ambiguities` stores only those
option IDs. Unknown settings are rejected; omitted settings use the data default.
Sprint uses a `runMultiplier` effect (5), combined by maximum rather than addition.
Normal running uses it automatically; heavy armor follows the chosen ambiguity
option unless Juggernaut removes the restriction. The initial option retains 3×
for heavy armor. `armorMovement.droidHeavySlowedSpeeds` lists native speeds 4 and
6, per the user's instruction; other droid speeds skip the Heavy Armor reduction.
This is not a House Rules option.

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

The imported library has 486 entries: 23 species, five heroic classes, twelve
prestige classes, nineteen skill pages (Knowledge contains seven fields), 64 feat
pages (including Weapon Proficiency), 200 Core talents, forty talent trees,
48 weapons, eleven armor entries, 46 general equipment pages plus Kel Dor special equipment, and seventeen Force
power references. Sixteen powers are Core; Corruption is a separate Force Unleashed
tab on a page whose Destiny is Core. The reviewed builder covers all 23 species and eleven armor entries,
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

### Core weapons, feat choices and species check controls

All Core feat and weapon catalog pages now map to reviewed builder records.
`choiceType: weaponGroup` includes each of the six ordinary groups and individual
exotic weapon IDs. `choiceType: weapon` selects a specific weapon; an `exotic`
`choiceScope` restricts Exotic Weapon Proficiency. Triple Crit can also select
`attack:unarmed`. Shared `featureChoices` supplies the builder, graph and engine;
display names never determine eligibility. `featChoice` requires a particular
feat for the same secondary choice, `trait` identifies the Rage species trait,
and `size` is a minimum size. Class bonus lists use the Core portion of each
pinned class table.

Weapons retain nullable damage for Net, Combat Gloves and grenade launchers.
`damageAction` is a non-damaging attack; `ammunition` supplies a reviewed grenade's
dice rather than inventing them. `double` describes a double weapon, not a doubled
damage roll. `modes` describe Amphistaff forms, and `launchers` describe Energy
Ball delivery. `accurate`, `inaccurate`, `rangeType`, `ranges`, `autofire`,
`autofireOnly` and `areaType` are explicit reviewed fields. Bowcaster uses rifle
ranges. Missing market cost prevents purchase, including Amphistaff.

Inventory optionally stores `weaponMode`, `launcher`, `ammunitionId`,
`attackStyle`, `fireMode`, `distance` and `carried`. Absent distance means no
chosen range circumstance; Point-Blank Shot is applied only when an explicit
distance is within actual Point-Blank range. Far Shot changes range penalties;
the Accurate interaction follows its Counseling switch. Targeting scopes are
not yet modeled, so the corresponding Counseling implementation covers only
the Far Shot/Accurate combinations. Inaccurate weapons cannot attack at Long
range, even when another modifier would improve the penalty. Thrown melee
weapons use Dexterity to attack and Strength for damage. Ammunition selection
specifies its type; it does not consume owned ammunition. Thermal Detonators
cannot be selected for grenade launchers.

Permanent unarmed attacks use the character ID as their routine reference;
imports and copies remap it. Optional `unarmedModifiers: {attackMod, damageMod}`
and `skillModifiers: {skillId: integer}` store independent manual modifiers.
Martial Arts increases unarmed dice and stacking Reflex dodge. `flatFooted`
removes positive Dexterity and dodge, except where Uncanny Dodge I applies.
Weapon Finesse changes the eligible attack ability, leaving Strength damage
unchanged. Counseling switches control unarmed universal proficiency and its
light-weapon treatment. Combat Gloves add their bonus once, not once per pair.

Force Boon increases the level's Force Point capacity by three; selecting it
adds those points, and advancement refills the derived pool. Strong in the Force
changes the roll to d8s; heroic levels 8 and 15 add dice, taking the highest.
Action/once-per-round timing remains player-managed.

Species `skillRerolls: [{skill, keep, when?}]` distinguishes replacement from
keeping the better check and retains Intimidate and Search Your Feelings/Sense
Force restrictions. `take10Skills` permits Take 10 even when threatened.
Reroll controls refer to a pending native skill check in this session, cannot
reroll Take 10, and become unavailable when its check modifier changes. They do
not automatically apply to substituted skill checks. `vision`, `scentRange`,
`breatheUnderwater`, `holdBreathMultiplier`, `proneImmune` and
`naturalHealingMultiplier` record sensory and survival traits. Vision and Scent
appear in stat blocks; environmental effects, healing and breath timers remain
manual. The Neimoidian Deceptive copy error remains manual.

`rules.encumbrance` stores pinned capacity fractions, size multipliers, affected
skills and movement limits. Only carried items contribute to the load and can
supply equipped benefits. Heavy Load begins at the inclusive boundary, applies
its seven skill penalties, and uses the worse of armor and load movement limits.
Lifting beyond normal capacity removes positive Dexterity/dodge and permits one
square per full-round action; exceeding maximum lifting capacity prevents
movement. Unknown weights remain visible and are not invented. The known subtotal
can establish a Heavy Load, but an unknown remainder may require a manual weight.
Sprint's interaction with Heavy Load has its own saved Ambiguities choice.
## Recovery and species actions

Species `bellow` declares its dice, cone, Fortitude target and condition costs. Its special attack uses character level rather than BAB, plus condition, nonproficiency armor and manual attack penalties; it has no ability or heroic damage bonus. General area attack errata (including the modified attack minimum of 10, Evasion, cover and no critical damage) remain applicable. `ambiguity:bellow-extra-dice` defaults to `uncapped`, as requested; `track-limit` caps its total condition cost at the remaining steps. The track itself always stops at Helpless. Dice pools above the roller's 500-die limit require an entered damage total, explicitly identified in the result, rather than a silently truncated roll.

`rules.secondWind` declares the HP fraction, eligibility threshold, daily and encounter limits, the two Jedi Counseling topic IDs, exhaustion removal time, and Force Recovery's die and cap. `rules.recovery` declares the three swift actions required by Recover. Species `rage` declares daily uses, melee bonus, duration base, recuperation time and the explicitly named prohibited skills. The Wookiee text gives examples rather than an exhaustive skill list; other applications still require adjudication.

Characters may store `recovery` with `secondWindsSpent`, `secondWindEncounter`, `ragesSpent`, `rageRounds`, and unique `persistent` causes. Missing state means unused resources. Spent counts survive reloads and changes to capacities; changing a feat, class or house rule never refills them. New encounter clears only the encounter limit. Ending Rage adds its persistent condition; recuperation removes the cause without moving the track. Recover is unavailable while any recorded persistent cause remains. Manual track edits remain available for other abilities and adjudication.

`rules.naturalHealing` declares eight hours of uninterrupted rest, one healing use per 24 hours, and the persistent causes explicitly cured by that rest. `rules.unconsciousRecovery` declares the Constitution check DC, first/retry intervals and fatal failure rules. Both retain separate revision-pinned source sections. Species `naturalHealingMultiplier` scales level-based natural healing; `limbRegeneration` declares its pinned source and d10 duration.

Optional saved recovery fields are `naturalHealingUsed`, `unconsciousRetry`, `dead`, and `limbs` (unique IDs, names, remaining whole days and per-limb persistent flags). Old recovery objects without those fields remain valid. Persistent causes additionally include `injury`, `limb-loss` and `other`; unresolved causes prevent natural healing and ordinary track recovery. A completed eight-hour rest removes the explicitly rest-curable causes before checking healing eligibility. New day represents 24 hours of game time: it resets daily spending/healing availability and advances species limb regeneration; it does not itself heal, rest or revive anyone. No real-time timer is used.

Received healing/repair at unconsciousness/disablement moves the track up one step. The user requested literal HP replacement as the default, with an additive alternative in Ambiguities. Automatic consciousness checks use the Constitution modifier, without the preceding track step's numeric penalty: the Helpless entry gives no numeric ability-check penalty. A fatal result records death, blocking recovery/actions until manually cleared for an applicable revival effect. Surgery, long-term care, external healing rolls and the source of a lost limb remain adjudicated; entered healing amounts are already resolved by the healer.

## Starting equipment

Optional species/class `startingEquipment: {sourceId, items: [{equipmentId, quantity}]}` explicitly grants named items for a first-level character. Its pinned source establishes the grant independently of each item’s purchase price. Kel Dor grant an antiox mask, protective goggles and one year of filters; Jedi grant a lightsaber only when Jedi is the first class. Ordinary Breath Mask mechanics are not substituted for the Kel Dor mask.

Characters optionally save `startingEquipmentClaims: [speciesOrClassId]`; newly added inventory entries carry `startingGrant` with that ID. Claims survive removal, species/class changes and reloads. Existing quantities satisfy a grant without duplication, and existing equipment selections remain intact. Free granted items do not block starting credits; ordinary possessions still do. `startingCreditsRolled` records a completed roll even if credits are later spent or edited to zero. Older saves need neither field.

Equipment `weight: null` means unspecified, not zero. Totals retain the unknown-weight indicator until per-item weights are supplied. Kel Dor’s printed mask/filter prices are replacements away from Dorin; local Dorin prices remain in the embedded rule text for manual purchasing. No price is inferred for protective goggles.

## Weapon attachments and Aim

Equipment `scope: {rangeReduction: 1, ignoresDarkness: boolean}` distinguishes Standard and Enhanced Low-Light Targeting Scopes. Inventory weapon `scopeUid` references an owned scope stack, allocated once per attached weapon up to its quantity. Scope weights remain in Inventory and are never added a second time to the weapon. An uncarried scope supplies no benefit. Removing it detaches referencing weapons. Attachments assert a resolved successful installation; the complete source retains its ten-minute/DC 10 Mechanics requirement.

Core Blaster Rifle/Carbine `retractableStock: {withoutCost}` specifies printed stockless prices. Inventory `stockPosition` is extended, folded or none; missing means the printed stock is extended. Folded stocks change proficiency and range to Pistols. Inventory `oneHanded` imposes the source’s -5 penalty on a resolved Rifle. Purchase stock choices affect the base price before licensing. This batch does not add aftermarket stock installations or upgrade-slot accounting.

`rules.weaponAccessories` retains pinned sources and declares scope category reduction, the rifle grip penalty, Careful Shot’s bonus and Deadeye’s extra die. Inventory `aimed` asserts completed Aim against the current target. Area attacks gain no benefit; normal Aim ignores cover, scopes reduce range penalties, Careful Shot adds +1 and Deadeye adds one weapon die. Enhanced Low-Light ignores Concealment from darkness, never Total Concealment. Physical range limits and Point-Blank Shot use actual distance.

Jedi Counseling 107 applies its complete published stacking table by default. Disabled, Far Shot uses its printed explicit penalties and a scope reduces one category. Routines apply Aim only to their first attack, lose it on a preceding different attack or miss, and clear saved Aim after successful execution. The separate sheet attack/damage dice remain calculation previews and do not resolve actions. Other intervening actions, changed targets and lost line of sight require clearing Aim; they are not represented by a global combat turn tracker.


## Loaded ammunition

Weapon `ammunitionProfiles` contains closed records with `id`, `name`, `capacity`,
`reloadAction`, `supplyIds` and pinned `sourceId`. Only explicit capacities are
reviewed; a quiver size never implies a magazine capacity. `rules.ammunition`
retains general reload/autofire sources and the ten-shot autofire cost.

Inventory may store `ammoProfile` (missing selects the first profile) and
`shotsRemaining` (whole number from zero to its capacity). Missing count means
untracked, preserving older characters and avoiding a free-ammunition assumption.
Changing supplies clears the count for explicit loading. Reload records a supplied
reload and fills that weapon's counter; supplies are managed separately in
Inventory. It never creates purchased supplies or changes credits. No charge
fraction conversion or battery weights are inferred. A stacked weapon entry tracks
one active weapon, rather than multiplying its magazine by the stack quantity.

Derived attacks expose `ammunition` with profile, remaining count, cost and
availability. Routine preflight aggregates every step for each physical weapon
UID, aborting before dice on any deficit. Results carry `ammunitionSpent`; atomic
application rechecks every referenced counter before decrementing and clearing
Aim. Misses and failed area attacks spend ammunition. The sheet's ▶ button resolves
a single attack through that same pipeline; its separate dice buttons remain
previews. Reload's tooltip gives the required action; elapsed combat time and
supplying a fresh magazine/pack are asserted by the player.


## Stun settings and incoming damage

Reviewed weapon fields `stunRange`, `stunOnly` and `stunDamageType` complement the
existing `stunDamage` dice. Inventory `damageSetting` selects normal/stun only
where the weapon permits it. Resolved weapons expose a separate `damageEffect`
(normal, stun or ion) while preserving physical damage types. Grenade payloads
carry the effect into their launcher. A blaster's Stun range is six squares with
no penalties; range feats and accessories cannot extend it.

`rules.incomingDamage` declares pinned sources, ordinary threshold steps, the
Helpless step, the survival Force Point cost and the two special damage profiles.
`damageOutcome` computes without mutation; `applyIncomingDamage` atomically
updates HP, shields, Condition Track, knockout cause, optional FP and death.
The explicit survival choice spends only on a qualifying lethal zero-HP attack;
it never spends on nonlethal damage or an ineligible positive-HP death. Incoming
amounts represent one attack, already adjusted for the attack's area hit/miss,
Evasion and cover. General shield/DR protection precedes HP-only halving, while
special threshold checks use the protected pre-halving amount. This combined
ordering and the type-specific knockout interpretation are documented for review.
The saved `ambiguity:stun-ion-death` choice defaults to `knockout`; `general-death`
applies the general lethal threshold and FP exception at zero HP. Ambiguity
passages select either a positive `paragraphCount` or `fullText: true`, never
both, so list-based rules retain their original presentation.

Optional saved `cybernetic` is a boolean target classification; it neither grants
prosthesis equipment nor applies unreviewed implant modifiers. Optional recovery
`stunUnconscious` preserves the printed nonfatal consciousness-check exception.
`rules.unconsciousRecovery.stunNoFatalCheck` and its pinned source declare that
exception. A natural one still remains unconscious even if its total reaches DC
10. Healing/check success/rest clears the cause. Bellow and other newly recorded
knockouts use their own cause rather than retaining an old Stun exemption.

Natural healing uses the same unconscious healing calculation as received
healing. Rest reports before/after HP, since literal replacement can reduce
remaining HP. The once-per-day ledger remains attached to the same recovery
object throughout revival. Old characters need none of the new fields.

### Power Attack and alternate weapon settings

`rules.powerAttack` references Power Attack 18412 and Weapon Sizes 6153. It fixes
BAB as the declaration maximum, a two-handed multiplier of 2, object/vehicle
exclusions and expiry at the start of the next turn. Optional character
`powerAttack` is an integer from 0 to 20. A declaration above current BAB or
without the feat blocks melee resolution and grants no bonus. Inventory weapons
and `unarmedModifiers` can save `targetKind: creature | object | vehicle`;
omission means Creature. Power Attack applies to all melee attacks, including
unarmed attacks, without changing ranged attacks or critical multiplication.

`rules.weaponSettings` pins the Rate of Fire passage in Category:Weapons 6153.
Stun and Autofire are mutually exclusive except for autofire-only weapons. State
changes choose a single setting. Saved incompatible combinations pass structural
validation for recovery, but cannot resolve an attack. This is separate from
ammo preflight, damage type and the six-square Stun range.

### Full Attacks

`rules.fullAttacks` pins Full Attacks 27404, Double Attack 24946, Triple Attack
24947, Dual Weapon Mastery I/II/III 24945/18125/18127 and Weapon Sizes 6153.
The closed mapping declares a Full-Round Action, one base attack, −10 for two
weapons, −5 each for Double and Triple Attack, the three Mastery penalties
(−5/−2/0), and expiry at the start of the next turn.

A routine can save `kind: fullAttack`. Each of its steps has count 1 and a unique
`source: base | twoWeapons | doubleAttack | tripleAttack`. A base step is required;
an extra step is required to run. Weapon references remain physical inventory
UUIDs. Source names do not impose resolution order. Extra feat attacks must match
an owned, eligible chosen weapon group or specific exotic weapon. A repeated feat
with another group provides another eligible choice, rather than another copy
of the same attack source. The Two weapons source requires two one-handed weapons
or both ends of the same double weapon. Rifle one-handed penalties remain separate.

Optional character `fullAttackPenalties` stores the three source penalties until
Next turn. A subsequent attack retains them, and using a source again does not
duplicate its penalty. The roll pipeline preflights the complete plan and aggregate
ammunition before dice; resource application rechecks all loaded counters before
recording the turn penalties. Printed previews use the same plan without mutation.
Ordinary routines retain their flexible count/modifier format and grant no actions.

`ambiguity:dual-weapon-proficiency` defaults to `both-weapons`. The user-approved
`either-weapon` reading permits Mastery if either weapon in the pair is proficient.
The separate −5 penalty on an unproficient weapon remains in both readings.
Untracked actions, extra limbs, weapon swapping and encounter timing remain player
declarations; this is not a complete action-budget or hand-occupancy tracker.

`rules.defensiveCombat` pins Fight Defensively 18172, the Total Defense section,
Melee Defense 18361, Dodge 18108, Mobility 18370 and Defenses 18097 (Helpless).
Its closed mapping specifies a Standard Action, next-turn expiry, −5 attack/+2
dodge for Fight Defensively (+5 if trained in Acrobatics), and +5 dodge for
Total Defense (+10 if trained). Melee Defense declares a Standard Action melee
attack with a penalty limited by both BAB and 5; its matching dodge bonus and
attack penalty persist until next turn. Different dodge bonuses stack and are
lost when Dexterity is denied. Total Defense prevents all weapon attacks and
Bellow, including routine attacks and attacks of opportunity.

Optional character fields are `defenseStance: none | fight | total`,
`meleeDefense: 0..5`, `dodgeOpponent: string` (up to 200 characters), and
`helpless: boolean`. State does not invent or roll the Standard Action attack
declared for Melee Defense. Next turn clears stance and Melee Defense; the
designated opponent persists until changed. Full Attack penalties remain
independent. Total Defense cannot be cancelled early by choosing Fight
Defensively, and Melee Defense cannot be reduced before its expiry.

Dodge's +1 applies only against its designated opponent. Mobility's +5 applies
only to attacks of opportunity caused by movement into/out of a threatened area.
These totals, including their combined case, are conditional rows and stat-block
annotations. They never change general Reflex Defense. Manual helplessness or
automatic unconsciousness/disablement uses a −5 Dexterity modifier for Reflex,
even with Uncanny Dodge. Other abilities and Dexterity-based checks keep their
actual scores. Target-side melee bonuses and offensive Force power effects are
not resolved by these controls.

`rules.charge` pins Charge 18026, Powerful Charge 18417, Improved Charge 18267
and Acrobatics 27350. A Charge is a Standard Action ending further actions for
that turn: at least 2 squares of movement within Speed, +2 competence on one
melee attack, and −2 Reflex until next turn. Powerful Charge adds another +2
attack and floor(half heroic level) damage. Improved Charge allows changes of
direction; it does not waive the Reflex penalty or terrain costs.

Optional `chargePath` saves `squares`, `difficultSquares`, `turns`, `lowObjects`,
`crossTerrain` and `acrobatics`. Defaults are 2/0/false/false/false/null. The
Acrobatics value is an entered check total; null rolls the derived skill. Low
objects require training and DC25; Cross Difficult Terrain uses DC15 alone or
DC35 in combination. A failed low-object check makes no attack. A failed terrain
check restores double movement cost; no attack occurs if that exceeds Speed.
Positions, low-object placement, occupied enemy squares, line of movement and
the action budget remain player declarations. Charge cannot Tumble and cannot
grant Full Attack extras. Those restrictions are preserved in its verbatim text.

`rollCharge` preflights the path/attack before dice and returns one attack with
temporary bonuses plus `chargeReflexPenalty: -2`. Resource application records
the penalty after ammunition preflight, clears Aim/Bracing, and consumes Mighty
Swing only when an attack occurs. Failed attempts retain the Reflex penalty but
spend no ammunition and make no attack roll. Optional character
`chargeReflexPenalty` is 0 or −2, expires on Next turn and is independent of
dodge/other defense bonuses. Path preferences persist across turn changes.

Entered Charge Acrobatics totals are consumed by one attempted check and cleared
on Next turn; movement/path preferences persist. Reloading before the attempt
retains the pending entered total, without reusing it after the action.

## Attack targets

`rules.attackTargets` is a closed, sourced mapping: Cover +5 and Improved Cover
+10 to Reflex; Concealment −2 and Total Concealment −5 to attacks; own Prone −5
melee; target Prone +5 melee/−5 ranged; Helpless +5 melee; attacks into melee −5
ranged unless eligible Precise Shot applies. Sources pin Prone 18420, Defenses
18097 (Helpless), Bonuses and Penalties 16336, Line of Sight 24330, Ranged Attacks
18433, Precise Shot 18418, and the existing reviewed Aim and Targeting Scope.

Optional `attackTarget` contains `cover` (`none`, `cover`, `improved`, `total`),
`concealment` (`none`, `concealment`, `total`), and boolean `darkness`, `prone`,
`helpless`, `adjacentToAlly`, `attackSquare`. Absent fields use none/false.
This is one declared target for equipped weapons and offensive routines. The
geometry and identity of the target remain player declarations. Values survive
save/import and are checked before rolling. Optional character `prone` affects
the attacker's melee rolls independently; species prone immunity overrides it.

`ambiguity:prone-helpless` defaults to `stack` (+10 melee against both), following
the unnamed-bonus stacking passage. The user-approved `no-stack` interpretation
uses +5, reading Helpless's "equivalent to attacking a Prone target" as the same
bonus. Both preserve −5 ranged against a Prone target and own Prone penalties.
Exact passages are embedded in House Rules → Ambiguities.

Cover stays separate from attack-roll modifiers. Routine intervals compare
the actual roll minus each attack's cover bonus to Reflex before cover; the
area minimum of 10 and natural 1/20 use the actual roll. An area miss against a
covered target deals zero. Cover for Burst/Splash is declared relative to the
area's center, and for Autofire relative to the attacker. The separate generic
Cover column remains available for comparing targets with different conditions.

Aim ignores cover only for the first attack and never benefits an area attack.
Losing Aim restores its range and normal-darkness scope effects together;
expiring Brace is additive, rather than overwriting the un-Aimed attack. A
low-light scope and Low-Light Vision ignore only normal darkness concealment;
Darkvision ignores total darkness too. Smoke and other concealment remain.
Total Cover prevents attacks. Total Concealment requires an Attack square
declaration, keeps its −5 penalty, and prevents Aim without actual line of sight.
The occupied square is not verified. Printed stat blocks derive general attack
profiles without the selected opponent's context, retaining the PC's own state.
Ithorian Bellow's separate Fortitude routine remains outside this weapon-target
mapping; its special interaction with the Reflex-specific cover passage has
not been mechanically inferred.
