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
`bonusClassSkills` is an optional unique list of skill IDs available as class
skills to every class of that species. It grants neither training nor additional
training slots. Creation, Intelligence increases, feat prerequisites and later
levels consume the same availability set.
`damageReduction` and `damageThresholdBonus` are optional nonnegative integers
for innate DR and a fixed species threshold bonus. DR combines by maximum with
other DR and follows the existing Lightsaber/Ignore DR handling.
`flightHeavyLoadForbidden` prevents native flight under a Heavy Load. A native
movement speed of zero stays zero when adding speed bonuses or carrying a load;
other printed movement modes remain separate.
`conditionalStartingFeats` lists nonrepeatable, unparameterized Feat IDs granted only when
their prerequisites are met during level-one replay. It grants no selectable
slot, never duplicates a possessed Feat, and never becomes available from a later
ability increase. Selection-dependent, manual-prerequisite and immediate-effect
grants require a richer format and are rejected here.
`conditionalFeats` uses the same restricted Feat-ID contract, without a
first-level limitation. Progression grants each Feat at the first replayed level
at which its prerequisites are met, without consuming a selectable slot. A
fixed-point pass handles prerequisites supplied by another conditional grant.
No conditional grant is earned in a level-zero draft.
`conditionalFocuses` supports multiple independent training-dependent grants.
`creationChoices` contains named, single-selection species choices. Each group
has a stable `id`, `name`, `kind` and `options`. Ability options contain additive
`adjustments`; language options contain one `language`; Skill Focus options
contain one `skillId` and are available only while that skill is trained. A
Skill Focus choice is required only when at least one offered skill is trained.
These grants consume neither a selectable Feat slot nor an extra trained-skill
slot. No choice has an implicit default. When a choice is required, a missing
or newly ineligible selection appears in Unresolved Choices.

Characters save `speciesChoices[speciesId][groupId]` as an option ID or `null`.
Choices survive species switches and earlier-level edits. Resolving a species
copies its fixed data, adds only its selected ability modifiers and language,
and routes selected Skill Focus through the ordinary conditional grant rules.
It never changes the generated ability pool or the pinned species record.
Source profiles stay separate from the character's narrative Gender field.
Two additional choice kinds cover species creation grants. `trainedSkill`
options contain `skillId` and grant first-level training independently of the
class skill list and ordinary training pool. The resolved record exposes
`startingTrainedSkills`; progression records their origin as `speciesTraining`.
Duplicate ordinary selections are preserved but invalid, so the player can
replace them rather than lose a training slot silently.

`startingFeat` options contain `featId` and use first-level eligibility. These
are nonrepeatable Feats without secondary choices, manual prerequisites or
immediate training/resource effects. Selecting an option adds it to
`conditionalStartingFeats`, never to the ordinary Feat slot list. The picker
uses the first-level context, so later Base Attack Bonus or ability increases
cannot qualify an earlier grant. If none of the offered Feats is eligible at
first level, no bonus is granted. Their unavailable options remain visible.
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

`rules.forceTalentAccess` pins the four Core Force trees, Light Side and Guardian Spirit, and their access sources.
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
Class `talentAccessSourceId` pins the reviewed class tree list, including its
supplemental trees, independently of the class article and individual sections.
Bulk talent entries retain an isolated, pinned section article. Known
prerequisites use the existing closed grammar; unresolved requirements retain
their verbatim passages in `manualPrerequisites` and require confirmation.
Unmapped effects use `automation: manual`, not guessed numeric modifiers.
Creation-time choices use the existing secondary-choice fields. Identical names
in different trees retain separate source identities and catalog articles.
Only reviewed identical reprints share a mechanical ID: `additionalTrees`
lists their other trees. Class access, graph tabs and tree prerequisites use
all memberships; an individual selection is still counted once. A shared name
alone never merges two source records.

`requiresLightSide: true` records the Light Side tree's acquisition requirement
and ongoing restriction. Such selections save `darkSideScore: 0`; increasing
DSS keeps the selection but makes it inactive until DSS returns to zero.
`darkSideScore` prerequisites can contain a closed `min`/`max` range, including
zero. Dark Side talents retain their existing positive acquisition snapshots.

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
`breatheUnderwater`, `holdBreathMultiplier`, `knockdownImmune` and
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

Optional `chargePath` saves `squares`, disjoint terrain counts, low-object
subsets, a movement mode, `turns`, `crossTerrain` and `acrobatics`. Missing
counts default to zero, the mode to normal, and the distance to 2. The
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
the attacker's melee rolls independently. Hutt `knockdownImmune` prevents being
knocked Prone; it does not remove voluntary prone actions or their penalties.

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


`rules.opportunity` records pinned source IDs, the base per-round quota,
Combat Reflexes Dexterity/flat-footed exceptions, allowed ranged groups,
folded-stock and Martial Arts I requirements, and cover/concealment exclusions.
Its default limit is `both`; `ambiguity:opportunity-limit` offers `opponent`
or `action` separately. The full conflicting passages remain bundled.
Optional character `opportunity` stores opponent/action event names, distance,
provocation confirmation and the spent `{opponent, action}` history. Import
validation rejects unknown fields, invalid distances and duplicate normalized
pairs. The history is independent of turn-limited attack penalties.


`rules.combatMovement` pins Move/Withdraw/Running Attack/Dodge/Mobility and
Encumbrance. Closed mappings specify diagonal/difficult/both costs, Withdraw's
Move Action and half-Speed/first-square limits, Running Attack's one weapon
attack/full-Speed budget, the conditional combined Dodge bonus and straining's
full-round movement restriction. Optional `runningAttack` stores a mode and
`before`/`after` segments; `withdraw` stores a mode, `path`, and `clearThreats`.
A segment's `squares` is the total physical grid count. Its `diagonal`,
`difficult`, and `diagonalDifficult` counts are mutually exclusive and must sum
to at most `squares`. Import validation rejects unknown fields, negative or
fractional counts, overcounted terrain and malformed mode identifiers. The
planner rejects modes without a current native Speed. Independent calculation
views retain attack timing without changing ordinary saved range or declarations.

`rules.cleave` is a closed, source-pinned mapping for Cleave, Great Cleave,
Follow Through, Fighting Space/Reach and Melee Attacks. It specifies the HP-zero
trigger, same-weapon/current-melee requirements, exact copied attack bonus,
another opponent within reach, one-per-round Cleave and one-per-turn full-Speed
Follow Through. Follow Through has no printed prerequisites and is a general
feat, without an invented class bonus list. Its full pinned article is bundled.

Optional character `followUp` stores validated attack snapshots (`tickets`),
a selected ticket, named previous/next opponents, HP-zero/immediacy/reach
confirmations, consumed victim claims, round/turn counters and a movement segment.
Snapshot IDs, weapon IDs, integer modifiers/damage, booleans and unique normalized
victim claims are validated; text is escaped in controls. Optional
`routineProgress` identifies the next flattened attack with a routine signature.
Changing routine structure invalidates that signature. Applying a rolled result
checks that its trigger/execution state and ammunition still match before any
resource is consumed. Importing or duplicating resets transient snapshots because
unarmed IDs and the execution context change, retaining spent limits.

`rules.acrobaticsMovement` pins Acrobatics, Move, Attacks of Opportunity, Prone
and Encumbrance. Its closed mapping requires trained Acrobatics/DC 15 for Tumble
and the Free/Swift prone alternatives, prohibits ordinary Take 10/20, gives
Tumble a Move Action/full native-Speed budget, doubles its normal movement cost,
and limits protection/pass-through to successfully tumbled squares. Normal prone
actions remain Swift/Move. The articles retain their full source wording.

Optional `acrobaticsMovement` stores `mode`, `tumble`, `occupied`, an optional
entered `check` total, and `path`/`tumbled` movement segments. Both segments use
mutually exclusive diagonal/difficult/both counts. Structural import validation
rejects unknown fields, malformed booleans/modes, invalid counts and check totals.
Draft paths may temporarily disagree while the two columns are edited; the action
planner requires a matching terrain subset, valid occupied count and cost within
Speed before rolling or consuming declarations. No passive Tumble immunity or
inferred board position is persisted. An entered check is consumed once.


Cross Difficult Terrain uses the closed `acrobaticsMovement.crossTerrain`
mapping: trained DC 15 within a Move Action, difficult terrain cost removed only
on success, and diagonal/low-object/Tumble costs retained. Combining ordinary
Tumble and Cross Difficult Terrain defaults to two separate DC 15 checks;
Nimble Charge's printed DC 35 is specific to that Charge combination.

Movement drafts gain optional `crossTerrain` and `terrainCheck` (entered total or
null). Each path/tumbled segment gains `lowObjects` and `diagonalLowObjects`:
subsets of the existing Difficult/Both counts, which remain inclusive of terrain
and low objects. The planner checks these subsets, and both the difficult-only
and low-object tumbled subsets, before rolling. Earlier drafts default the new
counts to zero. Cross failure restores normal terrain costs, leaves the route
unconfirmed when over budget, and never invents a shorter route or arrival.
Successful Tumble only protects actually tumbled squares; no passive immunity
or claimed arrival is saved.


`charge.difficultTerrainAmbiguityId` references the two-source saved ruling.
`normal-cost` is the default; `nimble-check` adds the printed Nimble Charge
requirement for difficult terrain (trained DC 25, or combined DC 35). Failed
Nimble Charge stops the attack independently of the route's cost. Its normal
success permits passage without ignoring cost; only successful Cross Difficult
Terrain removes that cost. The existing low-object and Improved Charge turning
rules remain. No character migration is required.


### Charge path costs

The closed Charge mapping references `rules.combatMovement` through
`movementCostRule` and includes the pinned Move source. Schema and validator
reject another cost mapping or a mismatch with the action’s double terrain cost.
The shared terrain-cost function serves both ordinary Move and Charge.

Optional character `chargePath` adds `mode`, `diagonalSquares`,
`diagonalDifficultSquares`, `lowObjectSquares` and
`diagonalLowObjectSquares`. `squares` remains total traversed squares;
`diagonalSquares`, `difficultSquares`, and `diagonalDifficultSquares` are
disjoint counts. Low objects are subsets of the latter two counts. Missing
counts default to zero and the mode defaults to normal. Structural validation
keeps incomplete drafts importable; action preflight rejects inconsistent
subsets and routes. The old `lowObjects` boolean remains an importable legacy
permission flag and prevents action resolution until counts are supplied or
the flag is explicitly cleared by editing a low-object count.

## Balance

`rules.balance` maps Acrobatics revision 27350 and Move revision 18374. Width
bands retain the three printed labels and DCs rather than interpolate unspecified
widths. Slippery or unstable adds one +5 adjustment. Successful movement uses half
Speed and the reviewed normal movement costs. Training prevents Balance's
flat-footed state; it is not required to attempt the check. No Take 10/20.

A character's optional `balance` state separates draft width, instability, route
and entered check/catch totals from the active check's saved DC. Damage rechecks
use that saved DC, even if the next movement draft changes. Failed checks cause
Prone followed by the DC15 catch check; a failed catch records a fall without
inventing a height, landing position or damage. Manual HP edits do not establish
that damage occurred; the incoming-damage action triggers the immediate recheck.

## Escape Bonds

`rules.escapeBonds` maps the Core Escape Bonds section of Acrobatics revision
27350. The closed mapping defines the skill, Take 10/20 restrictions, trained
faster-attempt adjustment, and each restraint's DC source and two durations.
Fixed DCs, an opponent's Dexterity check +10, an opponent's Grapple check, and a
declared DC remain distinct. Tight space explicitly grants one square on success.
Manacles have a printed duration but no printed DC; their mapping therefore
requires a declared DC instead of assuming the Binder Cuffs value.

Optional character `escapeBonds` is a closed draft with `restraint`, `fast`,
`dexterityCheck`, `grappleCheck`, `dc`, and `check`. Checks/DC are entered integer
totals or null. The two opponent checks have separate saved fields, so changing
restraint does not reuse a Dexterity total as a Grapple total. The planner checks
availability, training for the faster option, and a required opponent/declared
DC before rolling or consuming preparations. Ordinary attempts are untrained.
The entered Acrobatics total is consumed once. This is an action calculator;
it does not infer a persistent grapple/pin or unspecified restraint penalties.

## Falling and Jump Down

`rules.falling` maps Falling Damage revision 18166, Acrobatics revision 27350,
Jump revision 18311, Attacks revision 27406 and Skills revision 26694 before
calculation. All five mechanical sources are revision-pinned. The closed mapping
defines the Fortitude attack, complete three-metre damage increments, 20d6 cap,
critical/miss rules, DC15 reductions, three metres per ten-point margin, the
60-metre cap before reductions, landing condition, and existing damage pipeline.

Jump Down means an intentional jump. Its untrained permission defaults to the
specific Jump application, with the approved `jump-down-training` alternative
requiring trained Jump. Acrobatics always requires training. The approved
`fall-reductions` setting permits both checks by default; the alternative makes
them mutually exclusive. Combined checks resolve independently and sum only
successful reductions. Landing on feet requires at least one successful
reduction and no damage after SR/DR. Neither reduction invents a natural-1/20
skill outcome.

Optional closed character `falling` stores `kind`, decimal `meters`, `reduction`,
entered `check`/`jumpCheck`, `jumpMode`, `calm`/`safe` declarations, optional
attack-die `natural`, base `damage`, `ignoreDR` and `survive`. Structural validation
permits unfinished drafts. The planner rejects unavailable skills, disallowed
combined checks, required training, inappropriate Take10/20 contexts and manual
damage outside the reduced dice range. Entered base damage requires known
reduction totals; it is never used as a post-critical or post-protection amount.
Consumed totals/faces/damage are cleared once, while unused drafts remain.

Jump Take10 follows Skills' training and pressure restrictions, retaining any
explicit native species permission. Take20 requires declared safe retries and
plenty of time, and records twentyfold time. Acrobatics offers neither mode.
The landing is checked before damage state mutates; invalid survival declarations
cannot partially end Balance or spend resources. Falling objects, vehicle descent
rounds, and guided descent remain separate pending applications.

## Sourcebook reference library

`data/reference-index.json` and `data/reference/<content-sha256>.json` are separate
from reviewed mechanics. `tools/import-reference-library.py` resumes captures from
all official sourcebook categories and compiles pinned presentation with
`--offline`. It never creates character options or executable effects.

Index version 1 contains `capturedAt`, `license`, `candidates`, `records`, `pending`
and `excluded`. Each record has a stable `reference:<title-sha256-prefix>` ID,
canonical `name`, redirect `aliases`, sourcebook `books`, category-derived `kind`,
complete `searchText`, immutable article `path` and a `source` record. Sources
retain the wiki title, revision ID, timestamp, original wikitext checksum,
permanent revision URL and contributor history. Ambiguous category types remain
`reference`; no prose classification is invented. Aliases share the target's pin.

Article version 1 contains `id`, `name`, `source` and `article: {sourceId, blocks}`.
Blocks use the existing closed presentation tree. Wiki anchors may additionally
carry a `referenceId` that resolves to another imported page. External wiki URLs
remain available, including with Ctrl/Cmd-click. Runtime validation rejects
unrecognized markup, missing references, changed text or mismatched revisions.
`tools/validate-reference-library.js` additionally checks every file's content hash.

The index loads when Rules opens; individual articles load on demand. Successful
requests are cached by the hosted service worker for later offline reading.
Unread references require a connection; failures have a retry control. Optional
reference downloads never delay installation of the complete reviewed sheet.
Mechanics and their source approvals remain in `data/core.json`.

Imports exclude the recursive Homebrew category tree, redirected Homebrew pages
explicit Homebrew book declarations, and marked Homebrew sections on mixed pages. Missing pages and failed captures remain
in `pending`. Coverage reports distinguish imported text from partially mapped
mechanics and never count a mechanical mapping alone as an embedded article.

## Supplemental armor contract

Before supplemental calculations, ordinary armor keeps its existing numeric
fields and adds an optional `armorSlot` (`body` by default, or `tandem`). Body
armor replaces other body armor; explicitly tandem items coexist. `maxDex: null`
means no printed Dexterity cap; it never becomes a zero cap. Unlisted prices and
weights remain `null`, with Add owned and weight overrides rather than invented
prices or mass. Explicit book-specific prices/availability use distinct variants.

Optional `skillEffects` records contain `skillId`, `amount`, `when` and an optional
`proficiency` category. `when` is `always`, `hiding`, `darkness`, `concealArmor`
or `noncombat`. Armor Equipment bonuses require proficiency in the worn item’s category; an explicit `proficiency` field adds its printed requirement. Bonuses of the same type use the highest, while armor
penalties stack. Conditional declarations live in optional closed character
`armorChecks` boolean fields. Existing armor skill bonuses retain their original
proficiency condition. `conditionalDefenses` uses the same sourced conditional
defense structure as species, with equipment bonus typing.

`speedPenalty` is an additional armor movement reduction; `magneticSolesPenalty`
applies to normal movement only while magnetic soles are declared active.
Juggernaut ignores armor movement limits. `skillPenaltyExempt` removes only
armor skill penalties, preserving attack penalties and other armor restrictions.
`abilityBonuses` remains a proficiency-dependent equipment Strength bonus.

`armorDR: {amount, damageTypes, lightsaber}` supports all damage or explicitly
Energy/Fire damage; `lightsaber` states whether that item's DR survives Lightsaber
bypass. `allowsLightsaberDR` permits other personal DR against Lightsabers.
Incoming damage declares Energy, Fire and Lightsaber separately from Normal,
Stun and Ion. Existing Ignore DR remains an explicit override. These passives
never fabricate recharge pools, elapsed life support, upgrades, reactive uses,
container assignments or a completed medical procedure.

Personal energy shields, reactive armor, integrated weapons and medical systems
need their own typed state/actions before being automated. Complete rules remain
embedded while those systems are implemented. Basic catalog availability is not
a claim that every feature of an item is automated.

`blinds` applies the Blinding Helmet’s Total Concealment to outgoing attacks,
including its Aim restriction and Attack square declaration. It does not pretend
that all Perception applications require sight. The original target declaration
remains saved separately from this equipment-imposed effect.

`vision` is a Low-Light Vision capability; `visionProficiency` records an explicit
printed requirement. Vision is not itself an Equipment bonus. Stock Zero-Gravity
Stormtrooper Armor declares `wearerSize: medium` and `sizeOverride: large`.
Only the printed stock size is sold; owned gear that does not fit contributes no
worn effects and produces an unresolved choice. The wearer’s effective size
changes defense, threshold, Stealth, carrying limits and weapon handling while
base species size and fitted armor weight remain unchanged.

`strengthCheckBonus` applies only to declared lifting/dragging/pulling Strength
ability checks and requires armor proficiency; it changes no ability score.
`intimidateCircumstance` applies to declared Intimidate checks, including when
the modifier comes from a supported substitute skill. `armorChecks` additionally
permits `lifting` and `intimidating`. Favorable circumstances use the Skills
page’s +2 circumstance modifier. Identical armor circumstances do not multiply.

## Personal energy shield contract

Six armor records share the purchase family `Energy Shield` and use the printed
SR as their variant. `energyShield: {rating, charges}` records the printed rating
and five-charge capacity. These are tandem devices, with no armor/level substitution,
Fortitude bonus, fitted-size scaling or Speed reduction. Weight and availability
are unlisted, not fabricated. Armor templates and accessories need separate review.

Each owned generator stores optional closed `shield: {charges, sr, active, used}`
state. An untouched generator has five charges and is inert. Activation requires
a carried, equipped generator and an able wearer, consumes one charge and the
printed Swift Action, and creates its shield at normal SR. It cannot reactivate
that encounter. New encounter ends active shields and clears used status without
restoring charges. Unequipping suspends the worn benefit without ending the activation or clearing
its use; re-equipping during that encounter resumes the remaining SR.
Separate purchased generators have separate entries and state.

An active generator always adds its category’s Armor Check Penalty, even with
proficiency. Its printed Dexterity cap applies while active. Missing proficiency
also denies positive Dexterity and dodge benefits to Reflex and applies −5 Reflex.
The always-on Armor Check Penalty applies to attack rolls and the listed skill
checks. It creates no armor Speed reduction or zero armor replacement for heroic
level. Active Heavy shields retain the normal Heavy running limit, including the
existing Sprint alternative and Juggernaut exemption.

Incoming damage declares `energy` and `otherDamage`; Lightsaber and Fire imply
other damage for personal shield bypass. Pure Energy uses the highest applicable
manual/device SR, never their sum. Only the selected source loses SR when exceeded;
ineligible generators retain their SR. Manual SR retains its existing behavior.
The HP bar shows active device SR separately from manual SR editing.

Recharge uses the printed three Swift Actions and DC20 Mechanics check, increasing
current device SR by five to its maximum without restoring activation charges or
clearing its encounter use. A charge-count editor records externally obtained
charges without inventing a purchase price or refill action. No automatic rest,
day or encounter recharge is inferred.

## Prestige class contract

Classes may declare `classType: prestige`, `maxLevel`, explicit `talentLevels`
and `bonusFeatLevels`, `forcePointBase`, and `entryRequirements`. Their printed BAB
array has exactly maxLevel entries; startingHP is null and starting skill/feat
grants are empty. Starting characters must use a heroic class. Five-level classes
remain five-level classes; prestige classes do not inherit heroic bonus-feat rules.
Requirements are checked against the character before taking the first class level,
not against abilities, BAB, talents or feats that the new level would grant.

The entry tree supports level/BAB, trained skills, named feats with secondary
choices, named talents, counts from listed trees, Force talents/powers/techniques,
droid/species and full DSS. Named prerequisites match actual earned selections;
unmapped feats/talents remain unmet rather than assumed. In-game membership,
training and hardware clauses use their exact source wording and explicit saved
`entryDeclarations` at acquisition. Sith acquisition DSS is saved independently
from current DSS. Current DSS controls ongoing Sith class-feature access.

Printed per-level class features are separate grants, each with a pinned rule
section. Force Techniques, Force Secrets and Medical Secrets use independent,
earned choice slots and source-backed records. Imported wording does not infer
actions or calculations. Unsupported actions remain in the implementation queue.
Automatic effects need explicit reviewed mappings and retain their source grant.

Advancement uses the printed Force Point base of the class actually advanced,
not the largest base among past classes. Existing acquired HP/BAB and choices
are replayed; invalid class entry or levels above its maximum grant no benefits.
Changing earlier levels rechecks later entries. Old heroic characters retain
their existing schedules, hit dice, starting grants and persistence format.

`classBans: [{classId, throughLevel}]` records Master Privateer's printed permanent
advancement restriction after falling to the Dark Side. Existing levels up to the
recorded class level remain earned; later levels are blocked even after DSS drops.
The Known pirate checkbox corrects that recorded history. Class-specific talents
and activated feature effects remain distinct from the base progression model.

Class choice records use `id`, `kind`, `repeat`, `prerequisite`, `effects` and an
optional `choiceType: power`. Earned `level.classChoices` entries contain `id`,
optional `choice`, and optional `pending`; null entries preserve unfinished slots.
Power Mastery's reviewed `powerTake10` effect applies only to its selected power.
All other imported choice effects remain explicit pending mappings, not inferred
from the article. The shared option browser searches full source descriptions
and opens folded mechanics independently of graph layout.

Class `passives` use `{target, amount, step}` and scale by completed class-level
steps. Current mappings are Gunslinger's Pistol damage and Elite Trooper DR.
DR sources use the highest applicable value and normal Lightsaber bypass. Sith
entry checks full DSS at acquisition; the printed ongoing restriction disables
class defenses, talents and choice effects when current DSS is below Wisdom.
Already acquired HP/BAB and Force Points are not retrospectively removed.

### Core prestige talents

Prestige talents retain the normal feature record, full source article and explicit
repeat policy. `choiceType: power` restricts Force Power Adept to known powers.
`choiceGroups` optionally narrows weapon-group choices while retaining individual
Exotic Weapons. `talentChoice` prerequisites use a talent ID plus a `choice` of
`$choice` or a fixed weapon group; matching includes the record's `repeatGroup`
and fixed `weaponGroup`. This lets the generic and Lightsaber specialization
forms satisfy the same prerequisite without granting duplicate selections.

Reviewed passive effect targets add `lightsaberDexDamage`, `exoticProficiency`,
`multiattackReduction`, `controlledBurst`, `rapidShotPenalty`, `lightsaberReflex`,
`lightsaberWill`, `criticalThreat` and `tumbleSokan`. Fixed weapon effects can carry
`weaponGroup`; conditional focus/specialization uses `when: meleeAttack`.
Multiattack reductions add per matching weapon, cap the resulting penalty at zero
and apply during Full Attack planning as well as the saved turn penalties.
A 19-point critical threat still requires the attack to hit; it is not an automatic
hit. Source-specific threshold/DR reductions and activated talent actions remain
separate from these passive modifiers.

Sokan exposes Tumble's optional checkMode: take10 without affecting the separate
Cross Difficult Terrain roll. Its threatened/occupied squares cost one movement
square each; non-Tumbled terrain keeps its ordinary cost. Missing legacy modes
continue to mean roll.

Force Power Adept's activation makes two natural d20 checks against the same
current Use the Force modifier, keeps the higher result, spends one Force Point
and spends one suite copy. Only the selected known power and active talent grant
this action; natural-20 recovery and descriptor DSS apply once to the kept roll.

### Prestige prerequisite feats

The remaining prerequisite feats use the standard feature record and full pinned
article. A species prerequisite carries a species-family name in value, matched
against the character's named species with its book suffix removed. Wrruushi
Training explicitly requires Wookiee, Constitution 13 and Martial Arts I.

Flurry's reviewed rules contain its feat ID, melee attack bonus, Reflex penalty
and source. Character state stores a boolean flurry declaration. Entry requires
an able character with the feat and only Light Weapons or Lightsabers wielded;
its attack bonus and defense penalty last until the next turn. These modifiers
remain separate from defensive stances, Charge and Full Attack penalties.

Tae-Jitsu's passive unarmedCriticalDieStep effect carries one die step, capped at
d12. Derived attacks supply a separate criticalDamageDisplay. Routine critical
rolls use that expression before the ordinary critical multiplier; normal damage
and non-Unarmed attacks retain their usual dice.

Flurry's Reflex penalty persists after a weapon change; by default its attack
bonus applies only while the wielded weapons remain eligible. The alternate
reading of the printed duration is awaiting a ruling. Unarmed Light Weapon
classification follows the existing Jedi Counseling 112 switch.

Heroic class bonusFeatSourceIds pins the full class-specific bonus-feat tables.
Only reviewed, enabled feats enter bonusFeats; catalog text never grants an
unmapped feat. The new martial training styles retain general-feat access.

Flurry weapon changes use `ambiguity:flurry-weapon-change`: `eligible-weapons`
is the default; `retain-bonus` keeps the declared attack bonus until the next
turn. Both modes retain the Reflex penalty and require eligible weapons when
declaring Flurry.

### Preparing feat batches

`python3 tools/prepare-feat-review.py` writes the remaining official feat review
queue under `.build/`, using the pinned reference index. `--book` selects an exact
sourcebook name and `--limit` bounds the batch. Each candidate includes its source,
full article and printed prerequisite/effect/special passages. Missing labeled
passages require review; they do not imply absent prerequisites or repeat limits.
The command never adds options or modifies mechanics.

### Knights of the Old Republic feat contract

`droid` prerequisites use the species' droid state. `weaponFocusMode` with
`value: melee` requires Weapon Focus covering an actual melee weapon (including
unarmed Simple Weapons); it respects the existing weapon-familiarity switch.
`weaponProficiencyMode` with `value: ranged` and
`excludedGroups: [heavy-weapons]` requires an eligible ranged proficiency.
Withdrawal Strike uses its three melee-capable weapon groups and
`choiceExoticMode: melee` to exclude ranged exotic choices. Its choice is saved
through the existing secondary selector.

Improved Rapid Strike extends `attackTechniques` with two additional damage dice,
−5 attack (−10 below Dexterity 13), zero additional shots and
`requiresLightOrLightsaber: true`. Light is relative to the wielder's size.
The original Rapid Strike low-Dexterity Light-weapon exception does not apply.
Damage dice use the existing nonstacking technique/Mighty Swing calculation.

### Clone Wars defense effects

`conditionalDefense` carries `defense`, `against`, `amount` and `type`: insight
bonuses apply to Use the Force attacks or Deception/Persuasion checks without
changing ordinary defenses. `defenseBonus` with `when: fightDefensively` carries
a +2 competence bonus to Fortitude or Will through the existing next-turn stance
expiry; Total Defense is the no-attacks form of Fight Defensively.
`armorFortitudeToWill` copies a proficient armor's Equipment bonus to Fortitude
into Will as an Equipment bonus. Conditional Equipment bonuses replace a weaker
ordinary Equipment bonus rather than stacking with it.

Nelvaanian uses the existing ability, size, speed, language, Low-Light Vision,
Primitive starting-feat exclusions and Scent range fields. Shadow Swiftness needs
an encounter-specific target declaration before its movement exception is
automated. Full articles remain the authority for unimplemented trait actions.

Incoming damage can declare `requiresUseTheForce` to apply the matching
conditional Fortitude bonus to Damage Threshold. The declaration is per damage
application, like Energy/Fire, and is shown only when it changes the result.
Jedi Counseling 114 confirms the Fortitude-to-threshold relationship.

### Galaxy at War feat contract

`teamSkill` declares a fixed skill, +3 competence base, +1 per same-feat ally
within 12 squares, capped at +7. `teamFeatAllies` stores the declared counts per
feat. Its competence bonus competes with Skill Focus rather than stacking.
`defenseAbility` adds an optional ability for its defense; `defenseAbilities`
stores explicit choices, with the highest effective modifier as the default.
Predictive Defense uses Intelligence literally; Dexterity-only restrictions do
not apply to Intelligence under the default reading. Dodge losses still apply.
`thresholdDefense` enables Will for Fight Through Pain. The default chooses the
higher applicable defense for each damage context; a saved explicit choice can
select either. Conditional bonuses combine by type across selected contexts.
`rangedOpportunity` adds only to ranged attacks of opportunity.

Staggering Attack has two distinct published rules. Each gets a book-qualified
name, source section, prerequisite and complete section article. No merged
prerequisite or effect is inferred from their shared wiki page.

Book variants of nonrepeatable feats share `exclusiveGroup`; a character selects
one version of Staggering Attack rather than gaining the same named feat twice.

### Supplemental Force power contract

Each power retains its pinned article and standalone bracketed descriptors.
`actionText` preserves the printed Time text; `action` remains the default action.
An optional `actions` array lists actual alternatives. A suite copy can save its
chosen `action`, validated against those alternatives. Book versions have separate
IDs, section sources and qualified names. Intercept imports only its Force Power
tab; its starship maneuver is separate. Corruption retains its Force Power tab.

`lightsaber-form` is a descriptor. The general form-power rule is pinned separately:
activation requires an equipped, carried Lightsaber with `activated !== false`.
Legacy equipped Lightsabers count as active. Inventory can save `activated` for
Lightsabers; inactive Lightsabers cannot make ordinary Lightsaber attacks or
provide the wielded-Lightsaber defense bonuses. Power effects, target resolution,
sustaining and talent-specific return-to-suite exceptions remain separate work.

### Rebellion Era feat contract

Each feat retains its pinned complete article, printed species/skill/feat
prerequisites and reviewed class bonus access. Selection and effect automation
are tracked separately.

Scalar effects `secondWindFreeAction`, `secondWindMultipleUses`,
`secondWindAboveHalf` and `secondWindCondition` grant their named exceptions.
`secondWindConstitution` adds twice the Constitution bonus, minimum 2, when its
amount is 2. Recovering Surge cannot improve a persistent Condition Track.
`swimSpeed` adds to native Swim Speed before movement restrictions.
`bellowDice` increases base Bellow dice; `bellowConditionReduction` grants an
optional once-per-encounter reduction, saved as `recovery.strongBellowUsed` and
reset by New Encounter. Its reduction is included in the optional Helpless cap.

`skillRerollBest` names a skill whose existing reroll keeps the better result;
it grants no additional reroll. `vision` with `value: darkvision` grants Darkvision.
Existing characters without new recovery state retain their previous behavior.

### Level-plan drafts

Creation's Levels table edits the existing chronological `levels` array. Target
levels can be added through 20; each new row has a valid placeholder `classId`
and `pendingClass: true`. That placeholder is storage only. A pending class grants
no class level, BAB, ability increases, feats, talents, powers or HP, and prevents
later levels from contributing until its class is chosen. Saved drafts retain
all choices when an earlier prerequisite is invalidated.

Class pickers use the existing entry engine against the context immediately
before that row. Prestige declarations require explicit confirmation. Confirmed
classes use the ordinary class progression, multiclass starting-feat, talent and
class-feature schedules. Increasing an earned level replenishes Force Points
under the existing advancement rule; lowering the plan clamps resources rather
than adding uses. Changing class clears only class-specific entry declarations;
other selections are retained and revalidated. The table is a view over shared
progression rules, not a second calculation engine.

### Selectable options with manual effects

`automation` is explicit coverage metadata: `manual` means effects require manual
handling; `partial` means some effects or actions are automated. Prerequisite
checking and merely displaying text do not count as effect automation. These
labels never authorize a calculation. Existing mappings remain unchanged.

`manualPrerequisites` contains exact, source-derived requirements that the current
character model cannot verify. Selecting such an option requires a saved boolean
`manualRequirements: true` on that selection. Known typed prerequisites still
apply. The picker may offer the option before confirmation, but progression does
not grant it until confirmation. Removing confirmation deactivates dependent
choices through normal replay. No inferred hardware, memberships or campaign
permissions are created.

Additional secondary-choice formats are `enum` with `choiceOptions: [{id,name}]`
and `manual` with a verbatim user-entered choice stored as `manual:<text>`.
`choiceLabel` names the secondary control. Manual choices support unimported
options without pretending their effects or eligibility are checked. Both remain
pending until a nonempty secondary choice is provided. Enum IDs and manual text
are bounded and validated; repeat-by-choice rejects duplicates.

`choiceExcluded` removes listed skill IDs from a skill secondary choice (for
example, Logic Upgrade: Skill Swap excludes Use the Force). Fixed `featChoice`
requirements may include `choice` for an exact skill rather than the candidate
secondary choice. `level` prerequisites check the earned character level. Species
name requirements may refer to official species awaiting their own catalog import.
