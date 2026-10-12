# Core Rulebook import review

This batch imports reference text; importing does not certify mechanical mappings.
The Rules library marks entries **Available** when at least one reviewed builder option exists,
and **Reference** when it does not. Available entries can still require manual
application of conditional effects. Reference-only entries grant no bonuses and
cannot be selected or purchased through the builder.

## Source conflicts and variants

| Entry | Finding | Treatment |
| --- | --- | --- |
| [Neimoidian](https://swse.miraheze.org/wiki/Neimoidian) | Core gives +2 INT, +2 WIS, −2 STR, Deception focus and Deceptive; Galaxy of Intrigue gives +2 CHA, −2 STR and both Deception/Persuasion focus. Core automatic languages include Pak Pak; Galaxy of Intrigue omits it. Shared Characteristics instead mentions Durese, which neither Automatic Languages trait includes. The Core Deceptive sentence names a Twi’lek. | Preserve both labeled versions verbatim. Both are selectable under separate book-qualified names, using each explicit Automatic Languages trait. The apparent copy error remains verbatim; rerolls remain manual. |
| [Yuuzhan Vong](https://swse.miraheze.org/wiki/Yuuzhan_Vong) | Core has Technophobic; Legacy replaces it with Primitive. Both forbid Force Sensitivity and Force Points. | Preserve both versions; both are selectable separately. Core Technophobic and Legacy Primitive have distinct calculations. Force restrictions apply to both. |
| [Ithorian](https://swse.miraheze.org/wiki/Ithorian) | Characteristics names its language “Ithor”; Automatic Languages names it “Ithorese.” | Use the explicit Automatic Languages trait: Basic and Ithorese. Preserve both passages verbatim. |

These are different published versions, not permission to combine their benefits.
The wiki is a secondary transcription. Apparent errors need checking against the
published book and official errata before changing their wording or interpretation.

## RAW distinctions retained

| Rule | Consequence for implementation |
| --- | --- |
| [Weapon Focus](https://swse.miraheze.org/wiki/Weapon_Focus), Jedi Counseling | Proficiency with one weapon in a group can qualify; its bonus only applies to weapons with which the character is proficient. An explicit Weapon Proficiency feat prerequisite requires that actual feat. The optional Counseling switch supports partial proficiency for reviewed weapons, including Gungan Electropole familiarity. Individual exotic proficiency is now supported. |
| [Jedi](https://swse.miraheze.org/wiki/Jedi), Jedi Counseling | Multiclass Jedi does not inherently require Force Sensitivity. Talents requiring Use the Force or spending Force Points have additional restrictions; class membership alone must not grant them. |
| [Net](https://swse.miraheze.org/wiki/Net) | Uses grab/grapple rules, not damage dice. Missing damage must not become an invented damage value. |
| [Vonduun Crabshell](https://swse.miraheze.org/wiki/Vonduun_Crabshell) | No price is listed. Missing price is not zero credits; Add owned is available; Buy is disabled. Its armor statistics are calculated. |
| [Utility Belt](https://swse.miraheze.org/wiki/Utility_Belt), [Comlink](https://swse.miraheze.org/wiki/Comlink) | Several variants have distinct prices and weights. Preserve variant identity rather than averaging or choosing the first table row. Existing Standard belt and Short-Range comlink IDs stay unchanged. |
| Talent-tree pages | Core and Additional sections have different books. Individual talent records come from Core Talents headings only; complete tree reference articles retain their labeled supplementary sections. Existing selected supplementary talents remain available. |

## Campaign choices and licensing

- **Comlink functionality fees:** base price plus the full quoted cost of each
  selected functionality, as explicitly requested. Long-Range + Video is 750 cr;
  Long-Range + Encryption + Holo Capability is 4,000 cr. This is a campaign
  interpretation, not a formula inferred from the wiki. The Settings switch
  records it per character. With it off, quoted multipliers multiply; combining
  them remains ambiguous in the source. Miniaturization doubles the device base
  cost before these fees; its unlisted weight remains unknown until supplied.
- **Licenses:** the [Equipment](https://swse.miraheze.org/wiki/Equipment) table
  gives Licensed 5%, Restricted 10%, Military 20%, Illegal 50% of normal cost.
  Fees scale with quantity and fitted armor price. Paying records a pending
  application; approval/denial is explicit. The full check DCs, waiting periods,
  and application rules are embedded in Licensing. Black-market prices use
  ×2/×3/×4/×5 and do not charge a license application. Offworld Rare prices use
  ×2; licensing, when applicable, still uses normal cost. Prices do not establish
  that a dealer or license is available: the GM resolves sourcing and approval.
- **Variants:** grouped purchase controls retain concrete inventory identities.
  Existing Standard belt and Short-Range comlink IDs remain compatible. Small
  armor halves cost/weight; Large doubles them. Legacy biotech templates and
  Imperial-era availability overrides are separate future options; neither is
  silently applied to Core equipment.

## Jedi Counseling

House Rules has a Jedi Counseling tab with all 57 topics from Saga issues 105–115,
including nested optional rules. Each topic retains complete pinned wording and
its own saved switch; all default on unless explicitly disabled. Existing saved
off settings remain off; missing settings use the enabled default. Unsupported combat, Force power, vehicle,
and healing procedures are marked **Manual** rather than reported as automated.

Automatic switches currently cover:

- **Jedi Multiclassing:** Block/Deflect do not list Force Sensitivity as a printed
  prerequisite. Without Counseling, RAW permits selecting them; their Use the
  Force activation still cannot be used without Force Sensitivity. Enabling this
  Counseling ruling also restricts selection. Jedi class entry itself does not
  require Force Sensitivity, but Yuuzhan Vong explicitly cannot be Jedi.
- **Weapon Familiarity with Feats and Talents:** enabling applies familiar group
  classification to feat/talent bonuses as well as proficiency. With it off,
  familiarity provides proficiency as printed, without extending other bonuses.
- **Weapon Focus “Proficiency”:** enabling lets proficiency with part of a group
  qualify, and limits the bonus to proficient weapons. Explicit Weapon Proficiency
  feat prerequisites continue to require the actual feat.
- **Conditions and Damage Threshold:** marked **RAW unchanged**. The definition
  already uses Fortitude Defense; disabling an explanatory ruling does not
  create a different threshold formula.

Printed rules incorporating official errata remain RAW when Counseling is off.
The switches do not remove independently published errata from quoted articles.

Core Yuuzhan Vong mechanical-tool use is specified per skill check; mechanical
weapon classification can be changed in inventory. Ordinary physical weapons
are not automatically classified as mechanical merely because they are not
biotech. Biotechnology familiarity is retained as a species trait; future
biotech-device/weapon catalogs must model any device-specific handling penalties.
Force immunity to effects targeting Will remains a manual defensive trait until
Force targeting is implemented.

## Remaining mechanical review

### Core Force talents and power suite

Enabled all 16 Core talents in Alter, Control, Dark Side and Sense. Their existing
pinned sections and the Force Sensitivity/The Force access rules were checked
against fresh API snapshots. Force Sensitivity opens these trees for any heroic
class using its existing talent slots. Explicit prerequisites still apply with
Jedi Counseling disabled. Dark Side talents require DSS 1+ when acquired; the
selection retains that acquisition value so atonement makes the talent inactive
rather than erasing it. Current inactive talents cannot supply prerequisites.

Force Perception grants Perception training but substitutes Use the Force only
for Avoid Surprise, Notice Targets, Sense Deception and Sense Influence. Native
Perception remains the default. Force Pilot grants Pilot training and unrestricted
substitution. Visions additionally requires previously learned Farseeing.
Conditional actions, rerolls, per-day/encounter uses, DR 10, second-wind recovery
and ally effects remain manual; selecting a talent does not activate them.

Added Force Training and all 16 powers in the Core Force Powers table. Selection
uses full imported text, searchable disclosures and individual power-copy IDs;
duplicates are valid. Each training initially grants 1 + permanent Wisdom modifier
(minimum 1), and each subsequent permanent modifier increase adds one power per
previously earned training. This includes increases between negative modifiers.
The level ledger prevents later choices from meeting earlier prerequisites.

The Corruption page contains separate Destiny and Force Power tabs. A category
intersection had previously included it as a Core power because its Destiny is
Core. The corrected importer scopes both articles independently, attributes the
power to Force Unleashed Campaign Guide and keeps it reference-only. This is an
import correction, not a rules contradiction or a house rule.

Using a power spends its copy even on a failed check. Natural 20 flags recovery
at the end of the turn; an ordinary Use the Force check does not trigger this.
One Force Point recovers one copy, and a one-minute rest after combat restores
the suite. Dark Side descriptor use increases DSS, capped at Wisdom. The complete
suite rules remain embedded alongside the powers. Target defenses/effects,
maintaining powers, special enhancements and action timing remain manual.

### Jedi, Noble and Scoundrel talent batch

Added 47 Core class talents, completing the Core heroic class trees: Jedi Consular,
Jedi Guardian, Jedi Sentinel, Lightsaber Combat; Influence, Inspiration, Leadership,
Lineage; Fortune, Misfortune, Slicer, Spacer. Fresh API snapshots matched the
imported revisions. Each class tree list and each original talent section is
pinned independently. The full articles, including their labeled vehicle and
supplementary passages, remain verbatim. Core Force talent trees use the separate
Force Sensitivity access rule reviewed below.

Force Intuition and Force Persuasion grant their destination skill's training
during level replay, so later feats can use it as a prerequisite. Substitution
uses the source skill's complete check modifier once. The sheet defaults to the
better native/source modifier and retains a user's override. Trace does not
grant training or assume a computer network; its replacement requires selecting
the network option. Removing the enabling talent invalidates the substitution
and any later choices that depended on its training. Species conditional focus
also responds to training granted by these talents.

Lightsaber Defense, Coordinate and Sneak Attack enforce their 3/5/10 selection
caps. Jedi Weapon Specialization requires Lightsaber focus and adds 2 to melee
lightsaber damage. It and the Soldier's chosen-group version represent the same
talent for repeat eligibility, preventing a second specialization for that group.
Jedi Counseling 106 additionally gates talents requiring a Force Point to activate;
optional Force enhancements do not forbid a talent's ordinary use. Disabling the
topic preserves the existing RAW off-state.

Connections waives licensing fees and background checks for a purchase whose
complete quantity costs at most 1,000 credits per character level, before fees;
the resulting inventory license is approved. Fitted sizes, options and applicable
market prices count toward that limit. Its black-market multiplier reduction
applies independently of the allowance. Owned-only items remain unpurchasable.

Ally/target effects, temporary bonuses, actions, per-day uses, Educated's Knowledge
applications, rerolls, Wealth awards and starship effects remain manual. Their
complete mechanics are available in the talent browser and Features module;
selection does not turn conditional benefits into permanent sheet bonuses.

### Scout and Soldier talent batch

All Core Scout and Soldier class talents are selectable, adding 27 reviewed
talents. Scout now has Awareness, Camouflage, Fringer and Survivor; Soldier has
Armor Specialist, Brawler, Commando and Weapon Specialist. Their class-access
lists and each talent's exact parent-tree section have separately pinned sources.
Previously enabled Awareness supplements remain available; other supplemental
sections were not enabled. Indomitable and Demolitionist can be taken repeatedly.
Devastating Attack and Penetrating Attack require a secondary weapon-group choice,
with proficiency/focus checked for that group. Individual Exotic Weapons remain
outside the supported weapon-choice catalog.

Armor Mastery, Juggernaut and Second Skin require proficiency in the equipped
armor for their effects. Second Skin changes the armor bonus before Armored Defense
comparisons; Armor Mastery increases its Dexterity cap. Juggernaut removes armor's
speed and running restrictions. Long Stride adds 2 to natural movement speeds only
in Light/no armor, before Condition Track halving. Melee Smash adds 1 damage to
melee attacks without changing ranged damage or being doubled for two hands.
Rerolls, temporary points, explosives, allies, terrain, reactions and target-side
DR/threshold adjustments retain full rules text and remain manual.

**Configurable interaction: Sprint and heavy armor.** Run normally permits 4× Speed, or
3× in Heavy Armor/a Heavy Load. Sprint says 5× instead of 4× without explicitly
addressing the 3× restriction. The user requested an Ambiguities tab. It presents
the verbatim passages and saves a per-character choice: retain the armor limit
(initially 3×), or allow Sprint's 5×. Normal Sprint running now calculates at 5×.
Juggernaut explicitly removes armor's running restriction;
it does not remove Heavy Load restrictions. Carrying limits remain future work.

The user specified that droids with native speeds other than 4 or 6 do not suffer
Heavy Armor's speed reduction, and requested no House Rules entry for it. This
exception is applied directly to each native movement speed; the 3× running limit
remains distinct. Other creatures and Medium Armor keep the existing reductions.
This is a user-directed exception to the wiki's general three-quarters wording;
the original imported text is retained. Droid construction remains future work.

### Combat feat batch

Acrobatic Strike, Careful Shot, Charging Fire, Combat Reflexes, Coordinated Attack,
Quick Draw, Rapid Shot, Rapid Strike, Running Attack and Vehicular Combat are now
selectable. Each source revision and all five class bonus lists were checked;
the articles include their Special, combined-feat and Jedi Counseling sections.
Running Attack requires Dexterity 13, with no BAB prerequisite. Rapid Shot and
Rapid Strike require BAB +1; Strength/Dexterity 13 changes their attack penalties
rather than selection eligibility. Quick Draw uses a Swift Action.

These are conditional actions, movement, reactions and attack procedures. Their
rules remain manual; selecting them does not add passive attack/damage bonuses,
extra attacks or global Heavy Weapons proficiency. Vehicular Combat's proficiency
applies only to Pilot-operated weapons while piloting. Attack-context controls
and vehicle integration remain future work. No new conflicting wording was found.

### Armor batch

All eleven Core armor entries now have reviewed mechanics. Armored Flight Suit,
Armored Space Suit, Battle Armor, Ceremonial Armor, Corellian Powersuit, Heavy
Battle Armor and Padded Flight Suit join the existing four. Armor Proficiency
(Heavy) requires Medium and belongs to both Scout and Soldier bonus lists.
All retain their complete revision-pinned articles and fitted-size/license prices.

The Equipment page reduces Medium/Heavy movement to three-quarters, rounded
down, regardless of proficiency; Heavy permits running at three times speed.
Armor reductions precede Condition Track halving for normal and swim speeds.
Corellian Powersuit's +2 equipment Strength applies only while equipped with
Medium proficiency. It changes the displayed score, checks and melee attack/damage,
without rewriting base scores or level history. No new conflicting wording was
found. Heavy-load running limits, life-support resource tracking and supplementary
equipment upgrades remain manual; their rules are not implied by these calculations.

### Species batch

The builder now includes Aqualish, Cerean, Ewok, Hutt, Ithorian, Mon Calamari,
Quarren, Sullustan and Trandoshan, bringing the reviewed species total to 23 with the four separate Neimoidian/Yuuzhan Vong book versions.
Their source revisions are pinned separately from the imported text. Ability
adjustments, size modifiers, normal/swim speeds, languages, conditional Skill
Focus, Toughness, Primitive restrictions, natural armor and Hutt Force resistance
are calculated. The Hutt Will bonus is displayed separately against Use the
Force. Native-homeworld Background exclusions cover the newly selectable species.

Native rerolls, sensory traits, carrying limits, limb regeneration and Ithorian Bellow now have
controls and calculations. Bellow uses its
special Fortitude attack, sonic damage and condition cost; it is not an ordinary
weapon attack. The new linked species feat
articles are readable offline; importing them does not grant selectable feats.

Weapon Proficiency now includes Advanced Melee Weapons and Heavy Weapons. Advanced
Melee Weapons is a bonus feat for Noble, Scoundrel, Scout and Soldier; Heavy Weapons
is a Soldier bonus feat. Jedi may select either as a general feat. Both retain the
generic proficiency article and secondary-choice UI.

`data/mechanics.json` is the calculation authority. Its current species, feats,
talents and equipment cover a subset of the imported library. Before enabling an
entry, review prerequisites, class bonus lists, secondary choices, repeatability,
typed bonus stacking, timing, species exceptions, and conditional effects. Force
powers and prestige classes are readable now; their selection and progression
remain future work.

No rule conflict has been silently resolved by combining book versions or by
generating a summary. Descriptions, prerequisites and effects in the library are
the pinned wiki text. Each entry links to its source revision and contributor
history through Source revisions.

### Remaining Core feats, weapons and species controls

Reviewed and enabled the remaining 37 Core feat pages and all 48 Core weapon
pages against their pinned revisions. Specific-weapon secondary options cover
Exotic Weapon Proficiency and Triple Crit; Double/Triple Attack can choose exotic
weapons individually. Triple Attack requires Double Attack for that same choice.
Rage prerequisites belong to Wookiees and Powerful Charge requires Medium or
larger size. All five heroic class Core bonus tables are reviewed separately
from their Additional sections.

Unarmed attacks, Martial Arts, Finesse, Triple Crit, Force Boon and Strong in the
Force now have calculation support. Conditional action feats—including Power
Attack, Double/Triple Attack, Dual Weapon Mastery, Cleave and Burst Fire—retain
complete wording and remain player-configured through routine modifiers. Extra
Rage, Dreadful Rage and Extra Second Wind now have activation and recovery
tracking, including their printed limits and the separate Counseling switches.

The weapon review preserved these exceptions:

- Net initiates Grab/Grapple and has no damage dice.
- Grenade Launcher needs a grenade type; Thermal Detonators are prohibited.
- Amphistaff has no market price and three separately resolved forms.
- Bowcaster uses rifle ranges. Energy Balls use thrown, Atlatl or Cesta ranges.
- Double weapons roll one end's damage per configured attack.
- Combat Gloves add one unarmed damage bonus, with Small and Medium variants.
- Autofire carries its -5 attack penalty and area rules. Reviewed loaded-shot
  counters now spend ten shots per autofire attack. Stocks and scopes are supported;
  bracing and other readiness requirements remain manual. Incoming damage now
  applies the separately reviewed ion/stun rules.

Area routines no longer multiply natural-20 damage. Misses halve rolled damage;
Evasion, cover and splash have separate result columns. These are rolled damage
values before target damage-type effects and protection.

Species native-check rerolls and threatened Take 10 are implemented with their
original scopes and keep rules. Vision and Scent appear in stat blocks; carrying
and lifting limits, skill penalties and movement are calculated. Neimoidian's
misnamed Deceptive sentence remains visible and manual. Bellow and Rage now have action/state support. Natural healing
and regeneration have recovery controls; starting special equipment has explicit creation grants.

Sprint's printed ×5 also conflicts with Encumbrance's Heavy Load ×3. The
Ambiguities tab retains both pinned passages and defaults to the explicit load
limit. Juggernaut removes armor restrictions, not weight restrictions. No new
heavy-armor rule was added for droid speeds other than 4 or 6.

## Recovery and species actions

Checked current MediaWiki revisions: Catch a Second Wind 18474, Wookiee 27423,
Ithorian 18294, Conditions 24990, Recover 18447, Droids 26658, Control Talent Tree
24989, Survivor Talent Tree 26659 and Web Enhancements 26287. The two Second Wind
Counseling topics now run automatically when enabled; both default on. Extra
Second Wind and Tough as Nails add one base allotment under Multiple Second Winds,
or one use under RAW. Force Recovery rolls 1d6 per possessed Force Point, capped
at 10d6, without spending points.

Rage grants melee-only bonuses, blocks the three explicitly named concentration
skills, lasts 5 + CON modifier rounds and ends with persistent fatigue. The list
of prohibited skills is expressly exemplary; other applications need GM
adjudication. Ten minutes recuperation removes its persistent cause, not the
condition step. Recover cannot be used while any tracked persistent cause remains.
Manual track edits permit other abilities and GM adjudication. Natural healing
and completed eight-hour rest have separate controls described below.

Bellow's extra-dice wording gives no upper bound on dice once the Condition Track
is exhausted. Per the user's ruling, Ambiguities defaults to uncapped RAW and
offers Stop at Helpless. Its roll is against Fortitude; generic area attack
errata still supply the modified-roll minimum of 10, Evasion/cover handling and
no critical damage. Pools over 500 dice require an entered damage total and are
marked as entered; they never use a silently truncated roll.

Only official published rules, errata and Jedi Counseling are implementation
sources. Wiki homebrew is excluded, including Athletics. The user's specifically
requested ambiguity settings and Comlink pricing ruling remain opt-in/saved
campaign settings. No selectable mechanics in this batch contain homebrew labels.

## Natural healing and unconscious recovery

Reviewed Hit Points revision 23421, Conditions 24990 and Trandoshan 18573 against
fresh API snapshots. Natural Healing, Falling Unconscious and Limb Regeneration
are retained as separate verbatim sections, with source checksums and review pins.
Eight uninterrupted hours restore level HP once per 24 hours, doubled for Wookiees.
Rest clears only recorded causes whose printed cures include that rest: Rage,
Second Wind exhaustion and injuries from failed consciousness checks. Untreated
other causes and lost limbs continue to block ordinary recovery and natural healing.
The rest control asserts completion; it does not simulate hazards, interruptions,
long-term care or any consciousness checks due during the interval.

Consciousness checks use the Constitution modifier and DC 10, after one minute
initially and one hour after a nonfatal failure. Helpless lists no numeric check
penalty; the preceding -10 step is not applied to this automatic check. Success
adds level HP and moves up one step; failure records a persistent injury; natural
1 or failure by five records death. Death blocks ordinary recovery and actions.
The saved death checkbox can be cleared for an adjudicated revival effect; it
does not perform that effect or supply healing by itself. Prone is reported in
the roll log, as positional condition tracking is not yet implemented.

**User-resolved ambiguity: healing while unconscious with HP remaining.** The
source assigns the amount healed as the resulting HP, which can reduce HP after
an Ithorian Bellow knockout. The user requested literal replacement by default,
and an additive alternative in Ambiguities. Healing/repair moves up one step and
revives/reactivates; it does not remove unrelated persistent causes.

Each lost Trandoshan limb rolls 1d10 days. New day explicitly advances 24 hours
of game time; completed limbs remove their associated persistent cause without
moving the track or healing HP. Multiple limbs finish independently. Each limb has an explicit, editable persistent flag: losing a limb
does not itself establish a universal persistent Condition Track penalty. The injury
control records the loss; its initial track movement and other effects remain
adjudicated. No supplements or wiki homebrew were enabled in this batch.

## Starting species/class equipment

Checked current Kel Dor revision 26685 and Jedi 27381; both still match the reviewed pins. Kel Dor Special Equipment is preserved verbatim as a separately pinned section. Its mask, goggles and year of filters are free at creation; mask/filter replacement prices are 2,000/200 credits away from Dorin. The source states no weights and no goggles price, so these remain unspecified rather than borrowing ordinary Breath Mask statistics. Optional per-item weights can supply a GM’s adjudication. The embedded passage retains Dorin’s 500/50 credit prices; planetary replacement-price selection is manual.

Explicit creation grants are claimed once, preserve existing items and selections, and never debit credits. Jedi’s lightsaber uses the same declarative grant mechanism and is not awarded by multiclass advancement. Starting credit rolls remain available after free grants, and cannot repeat after spending the credits. Inventory origin and claimed-grant references are validated; old saved characters remain compatible. Neither Yuuzhan Vong version grants free weapons or armor in its reviewed species traits. No homebrew equipment or physiological timers were added.

## Scopes, rifle stocks and Aim

Reviewed current Targeting Scope 24958, Aim 15771, Retractable Stock 19749, Rifles 18458, Careful Shot 18018 and Deadeye 18095. The source revisions match existing pins where present; new sources retain checksums/history. Standard and Enhanced Low-Light scopes are official Core/Scum and Villainy options. Core rifle/carbine built-in stocks use their original weapon-price sources, with the official Retractable Stock rule for folded/extended behavior. No aftermarket upgrades are enabled yet.

Tests cover all eight Accurate/Far Shot/scope combinations across all four bands, the Counseling-off interpretation, unavailable inaccurate/maximum ranges, actual-distance Point-Blank Shot, owned/carried scope capacity, rifle grip penalties, and once-only Aim/Careful Shot/Deadeye routine results. Deadeye’s printed prohibition on stacking with Burst Fire/Rapid Shot is enforced by the conditional attack modes.

**Open wiki contradiction: Ion Damage vs ion weapon descriptions.** Ion Damage 26732 halves HP damage for every target, with extra track effects for electronic/cybernetic targets. Ion Pistol 18290 describes normal damage to those targets and half to other creatures. The user has been notified; the dedicated damage rule is the proposed RAW default. No alternate interpretation has been added without a ruling.

## Loaded ammunition review

Nineteen Core weapons now declare twenty ammunition profiles, each with a pinned
weapon source, capacity, supply references and reload action. The general Move
Action comes from Manipulate an Item 18345; Bow 16363 explicitly reloads as a Free
Action, while Flamethrower 18221, Missile Launcher 18369 and Grenade Launcher
18224 specify Full-Round Actions. Sporting Blaster Pistol 18521 supports either
a six-shot Energy Cell or a 100-shot Power Pack. Attacks 27406 explicitly consumes
ten shots/slugs for autofire and requires at least that many loaded.

Ten supply entries preserve printed prices and weights: Power Pack, Energy Cell,
Power Recharger, Power Generator, the two Slugthrower clips, arrow/quarrel quivers,
Flamethrower cartridges and four-missile magazines. Energy Cell gives no weight;
it remains unknown rather than zero. The generator's cost is 750 credits.

A loaded-shot counter applies to the active weapon represented by its Inventory
entry. Untracked legacy entries remain valid. A supplied Reload sets the stated
capacity and clears Aim, without creating or debiting assumed spare supplies.
Routine preflight totals all uses of each weapon before any dice, including misses
and failed area attacks. Single attacks use the same resolution and spending.

**Unspecified details retained:** Bowcaster lists a ten-quarrel quiver but gives no
loaded magazine capacity; none is invented. Melee battery lifetimes, included free
ammunition, conversion of partially used batteries between weapons, and loaded
versus spare battery weight are not inferred. Generator attachment/crew state,
spare consumption and four-hour recharging need separate reviewed resource state;
buying those supplies currently records possessions only.

## Incoming damage and Stun review

Stun Damage 18534, Ion Damage 26732, Hit Points 23421 and Conditions 24990
provide the reviewed incoming-damage mapping. Normal damage that meets the
current threshold moves one step; reaching zero HP becomes Helpless. Meeting
threshold on the attack reaching zero causes death/destruction, with an explicit
one-Force-Point survival choice. The already-unconscious normal-damage rule is
also retained: threshold damage kills even if HP would remain. A Force Point
cannot prevent that positive-HP death because its exception requires zero HP.

Stun halves HP damage, compares damage before that halving to threshold and moves
two steps. Droids are immune. A Stun knockout records its cause; natural 1 or a
Constitution check failing by five remains unconscious instead of dying. The
generic failed-check persistent injury still applies, since Stun supplies no
exception for it. Successful checks, healing and completed rest clear the cause.
A manual Stunned checkbox supports existing/adjudicated unconscious characters.

Blaster Stun settings use the printed six-square maximum with no range penalty;
Far Shot, Accurate, stocks and scopes cannot extend it. Melee Stun settings retain
melee range. Stun Baton uses 1d6 Bludgeoning normally or 2d6 Energy (Stun); Stun
Grenade and a launcher's Stun Grenade payload retain their Stun-only effect.
Autofire is not prohibited by the Stun page, so it retains the general ten-shot
cost and area rules when selected. No extra prohibition is invented.

Ion follows its dedicated rule by default: all targets lose half HP damage, with
the two-step threshold effect limited to electronic/cybernetic targets. A saved
Cybernetic flag identifies that target condition independently of species. The
contradictory Ion Pistol/Rifle descriptions remain visible in full.

**Interpretations notified to the user:** general SR/DR protection is applied
before HP-only halving, and threshold uses the protected amount before halving.
The pages do not provide a combined worked example. Dedicated Stun/Ion knockout
wording is treated as the specific exception to generic zero-HP death by default.
The user approved a saved Ambiguities alternative applying general death when
Stun/Ion damage reaches zero HP and meets threshold, with the same Force Point
survival option. This choice leaves positive-HP special-damage knockouts and
Stun consciousness-check protection intact. Full Stun/Ion passages retain the
list items containing their knockout rules alongside the general HP passage.

**Recovery correction:** natural healing during unconsciousness now uses the
user's literal HP replacement default, or the existing additive Ambiguities
choice. Eight-hour rest still clears eligible conditions and retains its daily
healing ledger; a type-specific revival no longer loses that ledger.

## Conditional attack techniques and Mighty Swing

Rechecked Burst Fire 16415, Rapid Shot 24956, Rapid Strike 24955, Mighty Swing
18364, Aim 15771 and Attacks 27406 against the live wiki; their revisions still
match the reviewed pins. The three attack techniques have closed declarative
records for weapon mode, proficiency, ability threshold, penalties, extra damage
dice and ammunition cost. Attack options are explicit and persist; merely owning
a feat never changes every attack. Burst Fire is a five-shot single-target attack,
including normal criticals, instead of the ten-shot autofire area attack. Rapid
Shot consumes two shots. Insufficient Strength/Dexterity applies each feat's
printed larger penalty; Rapid Strike retains its light-weapon exception and the
existing Counseling switch for treating unarmed attacks as light weapons.

Extra dice from Deadeye/Burst Fire/Rapid Shot and Mighty Swing/Rapid Strike do not
stack. A routine consumes Aim on its first weapon attack while retaining the
selected technique's benefits. Mighty Swing benefits the next melee attack in
the same round, including a miss, across weapon entries; preceding ranged attacks
do not consume it. Its explicit checkbox declares the two Swift Actions. Round
expiration remains adjudicated because the sheet does not yet track turns;
encounter/day/rest/death resets clear the declaration.

**Bow interpretation:** Bow 16363 holds one arrow and reloads as a Free Action.
The newly pinned Actions 24963 Free Actions section permits additional Free
Actions and forbids them while flat-footed. An explicit supplied Free reloads
choice allows Rapid Shot and repeated Bow attacks without inventing a larger
loaded capacity. Routine preflight calculates the arrows reloaded and consumed;
the loaded counter remains within its one-arrow capacity. Spare quivers are not
yet debited automatically. No optional Free Actions limit variant is enabled.

**User ruling for bracing:** the extended retractable stock requirement
applies to Pistols only. Heavy Weapons and Rifles do not require that stock. The
weapon must still be autofire-only, and bracing requires two Swift Actions
immediately before firing. The user explicitly declined an alternative stock-requirement setting. Bracing
was implemented in the subsequent batch below.

Validation: 189 JavaScript and 19 Python tests, rules validation and the complete
browser suite pass. Browser checks cover individual attacks and routines, ammo
preflight, misses and criticals, mixed-weapon Mighty Swing consumption, Bow free
reloads, flat-footed restrictions, full rules text, saved choices, Dracula mobile
layout and offline operation.

## Bracing

Rechecked live Attacks 27406, Burst Fire 16415, Retractable Stock 19749 and Aim
15771. Bracing's verbatim paragraph is preserved under a separately identified
pinned source section. Only autofire-only weapons can be braced; merely switching
a Blaster Rifle to autofire does not qualify. The user-approved stock reading
requires an extended retractable stock for Pistols, while Heavy Weapons and
Rifles qualify without one. A folded retractable stock disallows bracing under
its own explicit rule. No alternate stock-requirement setting was added.

The Brace checkbox declares two Swift Actions immediately before firing. It
replaces other bracing and Aim declarations. Only the first actual attack of a
routine can benefit, even if it misses; attacking with a different weapon first
loses the declaration. Bracing changes the autofire/Burst Fire penalty to −2,
without changing ammunition cost, area shape, damage dice or critical rules.
Reloading, stock/mode/equipment changes, Aim, Mighty Swing, Second Wind, Rage,
Recover, Bellow, Force actions, knockout, death and time resets clear bracing.
Routine preflight failures do not consume it. Untracked actions and game-time
passage still need manual clearing; this does not claim a complete turn tracker.

**User-resolved ambiguity: braced Burst Fire below Strength 13.** Attacks says
bracing imposes only −2, including Burst Fire; Burst Fire says to increase its
penalty to −10 below Strength 13. The user chose −2 by default and approved a
saved Ambiguities alternative retaining −10. Both exact passages are embedded.
The alternative has no effect without bracing or on ordinary autofire.

Validation: 196 JavaScript and 19 Python tests, rules validation, offline rebuild
and the complete browser suite pass. Dedicated browser checks verify the stock
reading's supported Core weapons, declaration replacement, first-attack use,
reload/Aim clearing, the saved ambiguity, full source text, Dracula mobile layout
and offline operation. Unit tests additionally verify folded-stock and Pistol
requirements, misses, criticals, mixed-weapon routines, action interruptions and
atomic resource failures.
