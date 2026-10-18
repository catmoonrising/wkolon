# Core Rulebook import review

## Cover, concealment and attack targets

Reviewed Prone 18420, Line of Sight 24330, Bonuses and Penalties 16336, Ranged
Attacks 18433, Precise Shot 18418 and the existing Helpless/Aim/scope passages.
Verbatim local articles retain their rule hyperlinks, including the official
Jedi Academy Training Manual discussion of Line of Sight. That GM alternative
is reference text and has not been silently automated. Homebrew stays excluded.

Prone and Helpless each grant +5 melee. The unnamed-bonus passage supports
stacking to +10; Helpless also calls its bonus "equivalent to attacking a Prone
target." Per the user, default to +10 and offer +5 under Ambiguities. The option
only affects that pair, independently of the attacker's Prone penalty.

Cover adds +5/+10 Reflex, never an attack penalty. Target declarations support
covered area misses, the actual-roll minimum of 10, first-shot Aim, concealment,
species vision, low-light scopes, and Precise Shot's into-melee exception.
Total Cover blocks attacks; Total Concealment requires a declared square and
keeps −5. The scope explicitly excludes Total Concealment. Saved opponents do
not alter general printed attack profiles. Geometry, reactions, falling/standing
actions, and Bellow's interaction with Reflex-specific cover wording remain
manual or pending separate review.

Validation: 243 JavaScript tests, 19 Python importer tests, rules validation,
deterministic offline import/rebuild, the full Chromium browser suite, and focused
Chromium/Firefox checks pass. Browser coverage includes +10/+5, save/reload,
verbatim rules, mixed Aim/cover routines, scopes, blocked attacks, general stat
blocks, Dracula mobile layout and complete offline reload.

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
Force now have calculation support. Conditional action feats-including Power
Attack, Double/Triple Attack, Dual Weapon Mastery, Cleave and Burst Fire-retain
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
The later Weapon Settings review corrects the original omission here: Category:Weapons
explicitly prohibits combining Stun and Autofire on switchable weapons. Its
autofire-only exception retains the general ten-shot cost and area rules.

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

## Power Attack and Weapon Settings review

Fresh API captures confirm Power Attack 18412 and Category:Weapons 6153. The
closed mappings reference the feat and the separately pinned Weapon Sizes and
Rate of Fire passages, retaining exact text and links.

Power Attack subtracts the chosen amount, up to BAB, from every melee attack
until the start of the next turn. Its damage bonus doubles for a Two-Handed
weapon or a One-Handed weapon held in two hands. Light weapons held in two hands
and unarmed attacks retain the single bonus. Relative weapon/character sizes
matter; a weapon one category larger requires two hands, including for its
ordinary positive Strength damage. Negative Strength is not doubled.

The damage bonus never applies against an object or vehicle. The attack penalty
still applies. Target choices are saved per weapon and for unarmed attacks;
Creature includes droids. Routines use each configured weapon's target choice.
The declaration survives hits, misses, criticals and resource spending until
Next turn. This control also clears pending Bracing and Mighty Swing; Aim keeps
its existing action/line-of-sight conditions. New encounters, days and completed
rest clear the attack declarations. End-of-turn Force recovery does not end
Power Attack early. Failed declarations or routine preflight cannot change it.

The weapon descriptions explicitly allow only one alternate setting at a time.
Selecting Stun on a switchable weapon restores Single-shot and clears Burst
Fire; selecting Autofire restores Normal damage. Burst Fire is unavailable on
its Stun setting. Older incompatible saves remain readable, with attacks blocked
and a specific reason until the player changes the setting. Autofire-only
weapons retain the explicit Stun exception, their six-square Stun range and
normal Autofire area/ammunition rules. No Core weapon is given a new Stun
setting; a fixture verifies the exception for future official imports.

## Full Attacks

Fresh API captures confirm Full Attacks 27404, Double Attack 24946, Triple Attack
24947 and Dual Weapon Mastery I/II/III 24945/18125/18127. Their verbatim articles
and prerequisite links are bundled. Full Attack is a separate structured routine
type: one base attack plus explicitly selected extra sources. Source order is
independent of resolution order. Two one-handed weapons or both ends of a double
weapon grant one extra attack; more armed weapons do not grant more two-weapon
attacks. Double and Triple Attack choices remain bound to their groups or exotic
weapons. Each source is used at most once, and Triple Attack requires the Double
Attack source. All selected penalties combine and remain on every subsequent
attack until the start of the next turn, including special attack rolls.

Mastery ranks reduce the two-weapon penalty to −5/−2/0. They do not reduce the
separate Double/Triple Attack penalties, nonproficiency, or one-handed rifle
penalties. Power Attack and the other configured attack techniques keep their
existing rules. Complete preflight occurs before dice and state mutation;
ammunition failures cannot record a turn penalty. Stat blocks preview the same
modifiers without executing the routine. Action costs and physical hand changes
remain player declarations, as with existing Aim and Bracing controls.

**User-resolved ambiguity: mixed weapon proficiency.** Mastery says its penalty
applies to all attacks but conditions the reduction on wielding “a weapon” with
which the character is proficient. The default requires proficiency with both
weapons in the pair. The user approved an Ambiguities alternative requiring either
weapon. Neither interpretation removes the separate nonproficiency penalty.

Validation: 214 JavaScript and 19 Python tests, rules validation, an offline
presentation rebuild and the complete browser suite pass. Dedicated Chromium
and Firefox checks cover source selection/order, grip failures, aggregate ammo
preflight, turn-long penalties/reset, the saved ambiguity, printed previews,
Dracula mobile layout and complete offline reload.

## Defensive combat

Fresh API captures pin Fight Defensively 18172 (including Total Defense), Melee
Defense 18361, Dodge 18108, Mobility 18370 and Defenses 18097 (Helpless). Full
articles and section-specific passages are embedded with original links and
revision provenance. Their explicit constants and triggers are reviewed in
`rules.defensiveCombat`; prose is never parsed into live calculations.

Fight Defensively applies −5 to all attacks and +2 dodge Reflex, or +5 with
trained Acrobatics. Total Defense gives +5/+10, prohibits attacks until next turn
and cannot be cancelled by another stance selection. Melee Defense's chosen
penalty is capped by 5 and BAB, applies to attack rolls until next turn and gives
an equal dodge bonus. Its field declares the required Standard Action melee
attack; it does not grant or roll another attack. A saved selection that becomes
ineligible grants no bonus and blocks attack execution until cleared.

Dodge and Mobility remain conditional, with separate opponent/movement/composite
totals rather than inflating general Reflex. Distinct dodge sources stack; all
are lost with the Dexterity bonus. Helpless explicitly treats Dexterity as 0 for
Reflex (−5), including when HP remains after Bellow. This corrects the previous
positive-Dexterity removal without changing actual ability scores. Manual
helplessness tracks bound/sleeping states; automatic knockout tracks organic or
droid wording. The incoming melee +5 modifier and offensive Force power effects
remain manual pending target/effect controls.

Validation: 223 JavaScript and 19 Python tests, rules validation, an offline
import/rebuild and the complete Chromium browser suite pass. Dedicated Chromium
and Firefox checks cover stacking, conditional totals, lost Dexterity, Helpless,
Total Defense attack/resource preflight, expiry, exact rules, stat blocks,
persistence, Dracula mobile layout and offline reload.

## Charge

Fresh API captures confirm Charge 18026, Powerful Charge 18417 and Improved
Charge 18267; bundled Acrobatics 27350 provides Cross Difficult Terrain DC15.
Their exact passages and linked rules back a closed `rules.charge` mapping.
Powerful Charge adds an additional +2 attack and floor(half level) damage.
Improved Charge allows direction changes rather than removing the −2 Reflex
penalty. Character Charge is separate from the article's Mass Combat rules.

Charge rolls one melee attack after a valid movement declaration. It never adds
extra Full Attack sources or leaves an attack bonus on later attacks. Movement
costs include difficult terrain; low-object Acrobatics uses DC25, or DC35 when
combined with Cross Difficult Terrain. A separate terrain check uses DC15. Its
failure restores normal difficult-terrain costs; failed low objects or movement
exceeding Speed prevent an attack. Both entered totals and rolled checks work.

Successful and failed attempts retain −2 Reflex until next turn. Bonuses stack
with existing defensive choices; repeated declarations do not compound that
penalty. Aim/Bracing are cleared; Mighty Swing is spent only by a performed melee
attack. The geometry of the map, enemy-occupied squares, reactions and required
end of further actions remain player declarations, with the complete rules
available beside the control and the restriction recorded in the roll log.

Entered Charge Acrobatics totals are consumed by one attempted check and cleared
on Next turn; movement/path preferences persist. Reloading before the attempt
retains the pending entered total, without reusing it after the action.

Validation: 233 JavaScript tests, 19 Python tests, rules validation, deterministic
offline import/rebuild, and the full Chromium browser suite pass. Focused
Chromium/Firefox checks cover single-attack bonuses, failed checks, terrain,
turns, Reflex expiry, attack blocking, entered-total consumption, saves, stat
blocks, mobile layout and complete offline reload.


Reviewed Attacks of Opportunity (16012), Withdraw (18615), and Move (18374)
against their official wiki revisions, retaining full rendered text and links.
Combat Reflexes (26021) says one opportunity per opponent; Attacks of
Opportunity says one per provoking action. The user approved enforcing both
by default, with either limit alone in Ambiguities. The opportunity mechanism
uses the pinned Combat Reflexes, Martial Arts I and Line of Sight text; movement
action controls are covered in the following review. No Homebrew pages were admitted.

Validation: 254 JavaScript tests, 19 Python importer tests, deterministic offline
import/rebuild, rules validation and the full Chromium browser suite pass.
Focused Chromium/Firefox checks cover both independent limits, interpretation
changes, quotas, ammunition, turn/round separation, exact source text, saves,
Dracula mobile layout and complete offline reload.


## Withdraw and Running Attack

Applied the pinned Move18374, Withdraw18615, Running Attack18462, Dodge18108,
Mobility18370 and Encumbrance passages. Also checked Old Republic Era Heroes
22304's Combined Feats section, reached through the Combined Feats redirect:
it grants the listed combination when both required feats are present.
Running Attack's local article retains the exact Dodge combination wording.
No Homebrew, inferred crawl penalties, obstacle shortcuts or automatic
Acrobatics successes were added.

Separate terrain counts avoid double-counting diagonals and difficult squares;
the combined category costs four. Withdraw requires the first grid square to
clear all opponents by the shortest route and protects no later movement.
Running Attack fits one current weapon attack between the before/after paths.
Native Swim, adjusted Speed, straining, target-at-attack range, Aim/Brace timing,
current attack penalties and nonduplicated conditional Dodge/Mobility totals
are covered. Geometry, incoming reactions and the broader turn action budget
remain player/GM declarations.

Validation: 266 JavaScript tests, 19 Python importer tests, rules validation,
deterministic offline import/rebuild and the full Chromium browser suite pass.
Focused Chromium/Firefox checks cover path and terrain limits, native speeds,
Aim timing, ammunition, conditional Reflex, exact articles, saved paths, Saga
printing, expanded mobile terrain controls and complete offline reload.

## Cleave, Great Cleave and Follow Through

Reviewed Cleave18032 and Great Cleave18223, and imported Follow Through20419
(Jedi Academy Training Manual), Fighting Space26700 and Melee Attacks18359.
All are official source passages; no Homebrew was added. Reach/Threatened Area
redirect to Fighting Space. Larger creatures are not assigned an invented
fixed reach; the extra target's reach is confirmed by the player/GM.

Cleave's effect does not restrict its triggering attack to melee, although its
extra attack must be melee with the identical weapon. Follow Through alone
explicitly requires a melee trigger. The user chose the default only for Cleave:
copy the full triggering modifier, including Charge and target-specific bonuses.
No recalculation alternative is added to Ambiguities. Great Cleave chains and
Follow Through's separate round/turn timing use explicit named HP-zero triggers.
Routine stepping permits immediate follow-ups between attacks.

Validation: 280 JavaScript tests and 19 Python importer tests pass, with rules
validation and deterministic offline import/rebuild. The complete Chromium
suite and focused Firefox checks pass, covering exact inherited modifiers,
Great Cleave chains, duplicate-victim prevention, native movement/terrain,
independent turn/round limits, Swift/free reload timing, routine interleaving,
resume/edit/import/duplication, verbatim rules, mobile themes and offline reload.

## Move, Tumble and prone actions

Reverified the live wiki API against pinned Acrobatics27350, Move18374,
Attacks of Opportunity16012, Prone18420 and Encumbrance18325. Direct page requests
returned403; API wikitext supplied the full passages, without guessing wording.
All implemented applications are from official references. No Homebrew was added.

Tumble is trained-only/DC15, protects only its threatened/occupied route subset,
and requires a Move Action. Normal terrain costs and Tumble are multiplied by
default: a diagonal tumbled square costs4 and a diagonal/difficult one costs8.
The wiki does not explicitly state how this added cost combines with terrain;
an optional flat2 interpretation was asked about and has not been added without
a ruling. Failed enemy-space passage is not automatically completed or assigned
an invented stopping position. Geometry, incoming reactions and the remaining
route are GM/player decisions. Feat-granted movement integration remains listed
separately rather than granting an unprinted additional action.

Prone actions use the printed Swift/Move and trained Free/Swift alternatives.
Checks use current modifiers and normal skill success, including natural1/20.
Failure changes no position and does not spend the normal fallback action.
Standing is not counted as a square of movement. Action timing
is preserved. Also checked Aim's exact "any other Action" condition and fixed
actual recovery/Force actions that previously left an Aim declaration active.

Validation: 293 JavaScript tests and 19 Python importer tests pass, along with
rules validation, deterministic offline import/rebuild, the full Chromium suite
and focused Firefox checks. Coverage includes native/adjusted speeds, terrain
subsets, trained requirements, real skill modifiers and natural1/20, failed
occupied-space passage, one-use entered totals, prone action types/immunity,
Aim and routine timing, strict saved fields, exact articles, math inputs, mobile
Dracula controls and complete offline reload.


## Hutt Supreme Stability correction

Hutt revision 18258 says Supreme Stability prevents being **knocked** Prone.
The earlier `proneImmune` mapping wrongly prevented voluntary Fall Prone,
disabled the sheet checkbox, and removed the melee penalty for a saved Prone
Hutt. Species mechanics now use `knockdownImmune`, reserved for forced
knockdown effects. Voluntary Swift/Free Fall Prone and Move/Swift Stand Up follow
the normal rules, and a Prone Hutt takes the normal melee attack penalty.
Existing characters retain their `prone` boolean without migration. The source
revision and article are unchanged; this corrects the reviewed calculation.

Validation: 294 JavaScript tests and 19 Python importer tests pass. Browser
checks cover both ordinary and trained Hutt prone actions, manual changes,
penalties, and persistence across reloads.


## Cross Difficult Terrain during Move

Reviewed Acrobatics revision 27350 and Move revision 18374 against the live API;
both match the pinned articles. Cross Difficult Terrain is trained DC 15 and
ignores difficult terrain cost on success. Move explicitly doubles diagonal
costs twice when combined with difficult terrain or low objects. Low objects
remain separate from the ignored difficult terrain surcharge.

The closed data mapping precedes calculations, with separate movement/check
state and low-object subsets. Cross and Tumble are separate applications with
no printed ordinary combined-check rule; the user chose separate checks with
no Ambiguities alternative. Nimble Charge's explicit DC 35 is kept specific to
that combination. Failure restores ordinary costs. Above-budget routes and
successful Tumble protection on untraversed squares are not automatically
resolved. Route geometry and actual squares traversed remain player/GM state.

Also reviewed Charge and Improved Charge against their current pinned revisions.
Charge explicitly permits difficult terrain at double movement cost, whereas
Acrobatics' Nimble Charge requires DC 25 to charge through low objects **and**
difficult terrain. This is a source contradiction, not an ordinary Move rule.
The user retained the action-page default and approved a saved DC 25
alternative, with the printed DC 35 when combined with Cross Difficult Terrain.
Failed Nimble Charge prevents the attack; a DC 25 success alone does not waive
terrain costs. The setting changes Charge's controls and resolution while
ordinary Move continues to use its separate DC 15 applications.

The ruling register in docs/rulings.md also retains explicit decisions to omit
alternatives (bracing stock clause, Cleave copied modifiers, shared ordinary
Acrobatics checks, and no extrapolation of droid armor slowdown), so they can be
revisited later.




Validation: 309 JavaScript tests and 19 Python importer tests pass. The full
Chromium browser suite and focused Chromium/Firefox checks cover separate
terrain/Tumble checks, restored failure costs, low-object/diagonal subsets,
Charge defaults and saved alternatives, full source passages, reloads, mobile
Dracula layout, and offline use. Offline import and compilation are deterministic.


## Charge diagonal and low-object movement costs

Rechecked Charge revision 18026, Acrobatics revision 27350 and Move revision
18374 through the API. They match the pinned articles. Move doubles diagonal
cost and doubles it again through low objects or difficult terrain. Charge
retains its explicit double terrain cost and Nimble Charge permissions; neither
Nimble Charge nor Improved Charge removes the underlying low-object surcharge.
Cross Difficult Terrain removes the terrain surcharge only.

Charge now uses the reviewed movement-cost mapping and explicit disjoint
terrain counts, including low-object subsets. Costs use the selected native
movement speed and existing speed adjustments. Failure restores ordinary costs
and blocks the attack when the route exceeds that speed; no shorter route is
automatically substituted. Excess-load straining is unavailable as a Charge.

The old low-object checkbox does not provide a count, so legacy true flags
remain importable drafts that require explicit counts before action resolution.
Editing either low-object count clears the legacy flag, including entering zero
to remove it. Existing difficult-square paths keep their original defaults.

Charge math fields now evaluate arithmetic before saving the declaration;
previously this early change handler tried to save the raw expression.

Validation: 321 JavaScript tests and 19 Python importer tests pass. The full
Chromium browser suite and focused Chromium/Firefox checks cover explicit
diagonal and low-object costs, native speeds, failed checks, legacy drafts,
arithmetic fields, persistence, full rule passages, Dracula mobile layout and
offline use. Offline import and compilation produce identical data hashes.

## Acrobatics Balance

Rechecked Acrobatics revision 27350, Move revision 18374, Attacks of Opportunity
revision 16012 and Defenses revision 18097 through the API. Balance's three
printed width bands, one slippery/unstable +5 adjustment, half-speed movement,
untrained flat-footed state, damage recheck against the same DC, and DC15 catch
check are explicitly mapped before calculation. No width interpolation, Take
10/20 permission, landing position or fall height is inferred. General Speed
remains available for movement that leaves the narrow surface.

Validation: 336 JavaScript tests and 19 Python importer tests pass. The full
Chromium browser suite and focused Chromium/Firefox checks cover half-speed
routes, training/manual flat-footed separation, original-DC damage rechecks,
catch/fall results, resource preparation, exact articles, arithmetic, persistence,
Dracula mobile layout and offline use. Offline import/compilation are deterministic.

## Acrobatics Escape Bonds

Rechecked Acrobatics revision 27350, Binder Cuffs revision 16217, Net revision
18383, Grab revision 18219 and Grapple revision 18220 through the API. The
Acrobatics pin is unchanged. Mapped its explicit escape DCs and durations before
calculations: ropes use the opponent's Dexterity check +10; nets DC15; cuffs DC25;
grapples the opposing Grapple check; tight space DC20 and one square on success.
Trained faster attempts add +10 DC and use the printed reduced duration.

Manacles are mentioned in both duration paragraphs but omitted from the DC
table. The wiki also has no separate Manacles article. A declared DC is required;
Binder Cuffs' Acrobatics DC25, Strength break DC30 and Mechanics removal DC25
are not conflated. This batch implements the Acrobatics escape application,
not Strength/Mechanics removal or persistent Grab/Pin state. Exact article text
and wiki links remain available offline.

Validation: 348 JavaScript tests and 19 Python importer tests pass. The full
Chromium suite and focused Chromium/Firefox checks cover DCs, all durations,
trained faster attempts, distinct opponent totals, manual manacles DC, tight
spaces, failed attempts, arithmetic, dice, saved drafts, unavailable actions,
Dracula mobile layout and offline checks/rules. Offline import and compilation
are deterministic.

## Falling and Jump Down

Rechecked and pinned Falling Damage revision 18166, Acrobatics revision 27350,
Jump revision 18311, Attacks revision 27406 and Skills revision 26694. Falling
Damage and Skills are now embedded rule pages, including their complete source
text. Acrobatics and Jump now also have mechanical pins, so future text refreshes
cannot change these calculations without source review.

Falling Damage specifies a +20 attack against Fortitude, complete three-metre d6
increments, half damage on misses, a 20d6 base cap, and Prone landing. It is not
an area attack, so the normal natural-1/20 and critical rules apply. Successful
reduction checks use DC15 and three-metre increments per ten over the DC; falls
over 60 metres cap before reduction. Normal SR/DR and incoming-damage rules apply.

The user approved untrained intentional Jump Down by default, with a trained-only
alternative for Falling Damage's more general wording. The user also approved
combining independently successful Acrobatics and Jump Down reductions by default,
with a mutually exclusive alternative. Both settings have source passages and
affect the planner, not just the archive. Skills' Take10 restrictions and Jump's
safe-retry Take20 permission are explicit context declarations. No automatic
Take10/20 is inferred for Acrobatics or a substituted Jump skill.

Validation: 367 JavaScript tests and 19 Python importer tests pass. Full Chromium
and focused Chromium/Firefox checks cover damage and caps, combined reductions,
both settings, Take10/20, landing, protections, Force Point survival, one-use
inputs, arithmetic, exact mechanics, persistence, Dracula mobile and offline use.
Offline import and compilation produce identical data hashes. Falling objects,
guided descent and vehicle descent timing remain pending separate applications.

## All-source reference import

The 2026-10-14 category capture contains 4,400 distinct candidate pages across
16 official Reference Books categories, excluding 367 pages in the recursive
Homebrew category tree. All 4,400 candidates now have complete pinned reference
articles; no fetch failures or pending titles remain. The initial bulk fetch and
parse took 403 seconds, plus the 11-second 100-page benchmark. Recompilation from
captured revisions is deterministic and does not request the wiki.

The reference index loads only when Rules opens. Its full-text search covers
names, sourcebooks, redirect aliases and complete official descriptions. Source
filters and 100-row pagination keep the library usable. Each article retains
formatted wiki wording, local links to imported articles, external wiki links,
its permanent source revision and contributor history. Successful reads remain
cached offline, including reads begun before the first service-worker claim;
unopened articles require a connection and have a retry control.

Official category membership does not make every section official. Nine candidate
pages append marked Homebrew: Cryokinesis, Followers, Saberdart Launcher,
Felucian Shaman, Mandalorian Warrior, Order of Shasa, Survivor and Zeison Sha
Warrior talent trees, and The Yuuzhan Vong Empire. These sections are removed by
heading extent or the bare PartialHomebrew notice's section/tab extent. The
Yuuzhan Vong page retains its official Vehicles tab after omitting the unofficial
NPC table. Survivor's existing Core reference is corrected too. Ordinary official
prose about “Homebrew intoxicants” in the Trianii Rangers is retained.

This import enables reading, not automatic mechanics or character choices. The
reviewed pack still has 23 species, 5 classes, 25 skills, 70 feats, 111 talents,
81 equipment entries and 16 Force powers. Those mappings, source approvals and
saved character rules remain unchanged. Per-page review and typed mechanical
implementation continue separately; 299 sourcebook pages have at least one
reviewed mapping, which does not mean the whole page is implemented.

Validation: every article's content hash, source pin, text, links and closed
presentation tree; 371 JavaScript tests and 25 Python tests; deterministic offline
rebuild; full Chromium browser suite and focused Firefox checks. Browser checks
cover lazy loading, full-text search, pagination, source filters, local links,
attribution, character-state preservation and Dracula mobile layout. Hosted
validation additionally checks offline reload of opened references and retrying
an unread article after reconnecting.

Hosted Chromium and Firefox checks both pass, including opened-page offline
reload and unread-page retry. Firefox's focused check uses an actual connection
outage through a local rejecting proxy, since its simulated offline switch left
service-worker network requests running in this environment. Reproduce with
`node tools/reference-live-checks.cjs firefox` (or `chromium`).

## Supplemental armor

Added 55 reviewed armor records, bringing armor to 66 and total equipment to 136.
The importer reads numeric fields from pinned captures, requires an approved
revision, and preserves unlisted prices/weights as null. Neo-Crusader Light Armor
has separate book variants because its price and availability differ. Orbalisk
statistics use the Jedi Academy Training Manual tab. Unique armor with no price
is Add owned only. Ordinary purchases include fitted sizes and licensing.

Calculations support explicitly tandem equipment, uncapped Dexterity, conditional
skill and defense bonuses, helmet vision, Blinding Helmet targeting, pressure-suit
and magnetic-sole movement, equipment Strength bonuses, lifting checks and Beskar
Intimidate circumstances. Armor Equipment bonuses require proficiency; identically
typed bonuses use the highest and armor penalties stack. Katarn remains Medium,
but its Perception/vision features retain the printed Heavy proficiency requirement.
Stock Spacetrooper armor fits Medium creatures and changes their effective size
to Large for defenses, threshold, Stealth, carrying and weapon handling.

Incoming damage supports applicable armor DR, Energy/Fire declarations and
Lightsaber bypass/exceptions without overwriting manually entered DR. Orbalisk
exempts skill penalties, not attack penalties. Light Pressure Suits reduce Speed
by two; Medium and Heavy suits reduce it by one in addition to normal armor limits.
No new House Rules or unrequested ambiguity alternatives were added.

Personal energy shields remain reference-only pending activation, charge and
Energy-only SR state. Reactive armor, integrated weapons, medical systems,
environment timers, containers and upgrade actions retain complete text but
still need automation. Catalog availability is not complete item automation.

Validation: 386 JavaScript tests, 25 Python importer tests, deterministic offline
rebuild, full Chromium regression suite and focused Firefox checks. Browser
coverage includes purchases/licensing, tandem gear, conditional bonuses, vision,
blind targeting, incoming DR, movement, stock sizes, persistence, stat blocks
and Dracula mobile layout.

## Personal energy shields

Enabled the six printed shield ratings from Energy Shields revision 19121,
raising equipment to 142 records. The purchase family is Energy Shield; inventory
names include the rating. Multiple purchased generators become separate entries
with independent charge, current SR, activation and encounter-use state. Unlisted
weight and availability remain unlisted, and device costs are not fitted-size
armor prices. Full source wording stays embedded.

Activation consumes one of five charges and a Swift Action; a generator can only
activate once per encounter. New encounter expires the effect and clears its use,
without adding charges. Recharge follows Attacks revision 27406: three Swift
Actions, DC20 Mechanics, five SR on success, capped at the normal rating. Failed
checks consume the action without granting SR. Charges are tracked separately.

An active shield always applies the category's Armor Check Penalty to attacks and
listed skills. Proficiency avoids the additional −5 Reflex and Dexterity denial,
but does not remove that check penalty. Printed Dexterity caps apply while active;
inert devices impose no shield effects. Shields do not lower Speed or replace
heroic level with a nonexistent armor bonus. Active Heavy shields retain the
general Heavy running restriction; existing Sprint rulings and proficient
Juggernaut apply. No new interpretation switch was added.

Pure Energy damage uses applicable personal SR. Physical or mixed damage bypasses
it, including Lightsabers, as Energy Shields explicitly requires. The general
Mixed Damage Types passage does not override that specific exclusion. Manual SR
and device SR are separate sources: the highest applicable current rating is used,
not added; only that source degrades when exceeded. Shield effects, DR and incoming
HP/threshold handling keep their existing order. The HP module shows device SR in
an Energy-labeled bar, preserving manual SR separately. Stat blocks include the
conditional rating. Armor templates and integrated accessory choices remain pending.

Focused coverage verifies prices, separate purchases, activation limits, mixed
damage bypass, source-specific SR spending, proficiency, Heavy running, recharge
success/failure, encounter expiry, closed import validation and stat blocks.

Validation: 397 JavaScript tests, 25 Python importer tests, byte-identical offline
rebuild, full Chromium regression suite and focused Firefox/Chromium checks. The
focused checks cover purchase quantities, charge/SR edits, worn-state suspension,
activation, recharge, damage, encounter expiry, saving, stat blocks, panel state
and Dracula mobile layout. Armor-granted vision also prints in stat blocks.

## Prestige-class advancement

Added all 32 official prestige-class records, keeping their complete pinned
articles and talent-access pages. Entry requirements are evaluated before the
first level in that class, including the general seven-prior-level requirement
from Heroic Classes revision 22558. Requirements for unmapped feats or talents
remain unmet; importing a class does not grant those missing abilities.
Story, membership and other nonnumeric requirements retain the printed wording
as explicit declarations. Character creation still begins with a heroic class.

Progression uses each printed Base Attack Bonus table, hit die, maximum class
level, talent schedule and Force Point allowance. Prestige classes grant neither
first-level heroic starting benefits nor the heroic even-level bonus-feat schedule.
Crime Lord's every-level talents, five-level class caps, d12 classes, the three
seven-base Force Point classes and Shaper's lack of Force Points are explicit.
Independent Droid and Droid Commander retain their printed HP rules.

Added 79 earned class-feature choices: 57 Force Techniques, 15 Force Secrets and
seven Medical Secrets. Choices use the existing searchable graph and source
popups, with secondary power selection after Power Mastery. Power Mastery permits
Take 10 on the chosen owned power, spends its copy normally and does not trigger
natural-20 recovery. Other techniques and secrets remain selectable and readable;
their activated effects still need automation.

Gunslinger's Trusty Sidearm adds completed two-level increments to pistol damage.
Elite Trooper DR participates in incoming damage, including Lightsaber bypass.
Class features and acquired choices print in gain order and stat blocks.
Sith entry records acquisition DSS; a later fall below Wisdom disables the
affected class's defenses, talents and feature effects without removing earned
HP, Base Attack Bonus or Force Points. Master Privateer's fall records a persistent
advancement ceiling, including after atonement; existing earned levels remain.

This is the prestige-class progression foundation, not complete automation of
all 32 classes. Many class-specific talents, supplemental prerequisite feats,
Force Tradition access and activated class effects remain pending. Tough as
Durasteel's prose/table conflict is awaiting the user's ruling before its action
is implemented.

Validation: 407 JavaScript tests and 27 Python importer tests; exact comparisons
of all 32 printed Base Attack Bonus/Force Point tables and talent-access lists;
byte-identical offline rebuild; full Chromium regression checks and focused
Chromium/Firefox checks for prerequisites, declarations, advancement, class
choices, Power Mastery, DR, persistence, stat blocks and Dracula mobile layout.

## Core prestige talents

Enabled 83 reviewed Core talent sections across 14 prestige trees, bringing the
selectable talent catalog to 194. Sources retain their pinned tree revisions and
complete section articles. Prerequisites are explicit, including matching weapon
choices and known powers; repeatable minions, power selections and Multiattack
Proficiency preserve their printed policies. Class access comes from the reviewed
class records, not availability of a downloaded page. The eight remaining Core
tradition talents await tradition membership/access support.

Connected Ataru's optional Dexterity damage and two-handed bonus, Niman's wielded
Lightsaber defenses, Greater Weapon Focus/Specialization and Exotic Weapon Mastery.
Greater specialization's generic list excludes Lightsabers; the Duelist form
retains its fixed Lightsaber choice. Canonical repeat groups prevent obtaining the
same specialization twice through generic and fixed forms.

Multiattack Proficiency adds its reductions per matching weapon and caps the
resulting Full Attack penalty at zero. Mixed weapon routines retain each weapon's
own modifier, including when the routine resumes with saved turn penalties.
Weapon familiarity follows the existing Jedi Counseling switch for both these
benefits and Double/Triple Attack group matching. Controlled Burst handles normal
autofire, low-Strength Burst Fire and Bracing; Trigger Work removes Rapid Shot's
attack penalty without granting the feat or bypassing its attack restrictions.

Vaapad extends Lightsaber criticals to natural 19 while preserving the requirement
that 19 hit the target. Routine damage tables still show zero against a defense the
roll misses, and stat blocks show the expanded critical range. Area attacks retain
their existing no-critical rule.

Sokan gives Tumble an explicit Take 10 option and one-square costs for its selected
threatened/occupied squares. Other terrain retains its ordinary costs, and Cross
Difficult Terrain still resolves its independent check. Force Treatment and Force
Deception grant their skill substitutions and conditional training. Inactive Sith
class talents remove training they alone supplied, while ordinary training remains.

Force Power Adept selects a known power and exposes its paired-check activation:
one Force Point, two Use the Force rolls, higher result and one spent suite copy.
Natural-20 recovery and descriptor DSS use the kept roll once. Combined Take 10
variants, general Force Point round restrictions and the remaining activated talent
effects still need work. Vehicle talents and minion mechanics also remain pending;
selectable source text does not imply complete automation.

Validation: 420 JavaScript tests, 27 Python importer tests, byte-identical offline
import/rebuild, unchanged existing rules records, full Chromium regression checks
and focused Firefox/Chromium checks for talent choices, source popups, Ataru grips,
Sokan, Force Power Adept, Trigger Work, saves and Dracula mobile layout.

## Prestige prerequisite feats and Flurry

Enabled ten official prerequisite feats: Biotech Specialist, Flurry and the eight
martial-style Training feats. Each retains its pinned full article and explicit
ability, skill, feat or species prerequisites. Wrruushi matches the Wookiee
species family, including separate book variants. Heroic bonus-feat additions
were checked against both the feat categories and the printed class bonus lists:
Flurry for Jedi/Noble/Soldier; Biotech Specialist for Noble/Scoundrel. The martial
styles remain general feats. These selections unblock relevant prestige entries.

Flurry has a saved declaration, +2 melee attack, −5 Reflex and next-turn expiry.
Declaration requires only size-relative Light Weapons or Lightsabers. Switching
to ineligible weapons removes the attack bonus by default while retaining the
Reflex penalty. The accepted Ambiguities alternative keeps the attack bonus until
the next turn; it never bypasses declaration eligibility.

Tae-Jitsu advances unarmed critical damage dice before multiplication, capped at
d12. Normal damage is unchanged. Charge additions and one-use Mighty Swing
benefits propagate through the alternate critical expression. Biotech projects,
remaining martial-style actions, Tae-Jitsu's second Dodge opponent and encounter
limits remain pending; selectable source articles do not automate these effects.

Validation: 430 JavaScript tests and 27 Python importer tests, offline import and
rebuild, full Chromium regression checks and focused Chromium/Firefox checks for
Flurry switches, saved Ambiguities, expiry, prerequisite graphs, class bonus lists,
source popups, critical dice and Dracula mobile layout.

## Knights of the Old Republic feats

Enabled 18 remaining feat pages with their complete pinned articles, explicit
prerequisites and reviewed heroic bonus-feat lists. The feat catalog now has 98
options. Bonus access was checked against both the page's category and the full
class bonus table; military and droid feats remain general selections.

Critical Strike requires melee Weapon Focus, Sniper Shot's prerequisite excludes
Heavy Weapons and both Logic Upgrades require a droid. Withdrawal Strike presents
a single primary choice with secondary melee groups/exotics, requiring matching
proficiency. It does not expose ranged exotic options.

Improved Rapid Strike has an attack-mode selector, size-relative Light-weapon or
Lightsaber restriction, two extra damage dice, −5/−10 Dexterity penalties, normal
critical multiplication and existing Mighty Swing nonstacking/consumption.
The feat's low-Dexterity penalty has no Light-weapon exception.

Implant Training remains an embedded reference until implant equipment and its
Condition Track interaction are supported. A general cybernetic-state checkbox
does not establish possession of an implant. Remaining actions and passive effects
of these 18 feats are not yet automated, including Power Blast, Sniper Shot's
declaration, Conditioning, Increased Agility and Withdrawal Strike's target-side
movement restriction. Source availability is separate from action automation.

Validation: 437 JavaScript tests, 27 Python importer tests, exact bonus-list checks,
byte-identical offline import/rebuild, full Chromium regression checks and focused
Firefox/Chromium checks for new selectors, full
source text, feat prerequisites, Improved Rapid Strike damage/penalties, saved
choices and Dracula mobile layout.

## Clone Wars feats and Nelvaanian

Enabled all 21 remaining Clone Wars feat pages with pinned complete articles,
explicit prerequisites and reviewed class bonus lists. Nelvaanian adds +2 Wisdom,
−2 Intelligence, Medium size, Speed 6, Nelvaanese, Low-Light Vision, Scent 10 and
the printed first-level Primitive exclusions. Anointed Hunter requires the species
family. Scent's situational checks and Shadow Swiftness's target-specific movement
exception still need encounter declarations; their full text remains available.

Unstoppable Force supplies +5 insight to conditional Fortitude/Will against Use
the Force; Unwavering Resolve supplies +5 insight to Will against Deception or
Persuasion. These do not change ordinary defenses. Wary Defender adds +2 competence
to Fortitude/Will for Fight Defensively, including its no-attacks Total Defense
form, and expires through the existing next-turn control.

Grand Army of the Republic Training copies proficient armor's Equipment Fortitude
bonus into Will, including Second Skin. A conditional Equipment bonus replaces
the ordinary Equipment bonus if larger, rather than stacking; different bonus
types still combine. Damage Threshold shows its conditional values in the sheet
and stat block. Incoming damage can declare that the attack requires Use the
Force to apply the corresponding conditional Fortitude bonus to threshold.

The Nelvaanian species-feat table gives Anointed Hunter a different duration from
the full feat. Both texts are preserved, and the full feat's end-of-current-turn
wording will control its pending action. The remaining feat actions, damage
modifiers, target declarations, movement triggers and encounter limits still need
automation; imported options do not imply those effects are complete.

Validation: 445 JavaScript tests, 27 Python importer tests, byte-identical offline
import/rebuild, unchanged existing mechanical records, reviewed bonus-list
extensions, full Chromium regression checks and focused Chromium/Firefox checks
for conditional defenses, typed
Equipment stacking, Wary Defender modes/expiry, Force-attack threshold, Nelvaanian
creation, full source popups, save/reload and Dracula mobile layout.

## Galaxy at War feats

Enabled 35 feat options from 34 pages, bringing the feat catalog to 154. Staggering
Attack has different Scum and Villainy and Galaxy at War rules; each has its own
book-qualified name, prerequisite and pinned section article. A nonrepeatable
version group prevents taking the same named feat twice. The Jedi/Soldier class
tables explicitly grant the Galaxy at War version as a bonus feat despite missing
category tags on the feat page; the Scum and Villainy version remains general.
Mission Specialist offers trained secondary skills and can repeat for another
skill. Other new prerequisites and class access retain their printed limits.

Thirteen team feats grant a +3 competence skill bonus, increased by declared
same-feat allies within 12 squares to a maximum +7. It competes with Skill Focus
rather than stacking. Counts are saved per character; additional movement and
other benefits in those feat articles remain pending. The default counts other
allies; the general Team Feats page's Skill Focus comparison is retained as an
unanswered ruling topic.

Force of Personality, Predictive Defense and Resilient Strength add their optional
defense abilities. Auto selects the highest effective modifier; explicit lower
choices are supported and saved. Predictive Defense uses Intelligence literally
without Dexterity-only caps or denial; Dodge losses still apply. The alternative
reading is awaiting the user's answer. These choices do not change attacks, HP
or unrelated ability checks.

Fight Through Pain chooses Fortitude or Will for threshold, using the better
applicable defense for each context by default. Explicit choices are saved.
Incoming damage supports multiple declared contexts, combines bonuses by type,
replaces weaker Equipment bonuses and avoids adding the same insight bonus twice.
This handles a conditional Will bonus becoming better than normal Fortitude.
Opportunistic Shooter adds +2 only to ranged attacks of opportunity.

Remaining actions include forced movement, weapon-specific feat benefits,
Steadying Position, Never Surrender and Fortifying Recovery/Bonus Hit Points.
Their complete source text is present; selection does not imply full automation.

Validation: 455 JavaScript tests, 27 Python importer tests, byte-identical offline
import/rebuild, preserved existing mechanics, full Chromium regression checks and
focused Chromium/Firefox checks for ally counts/competence, saved defense choices,
conditional threshold changes, secondary skill choices, exclusive book versions,
full section articles and Dracula mobile layout.

## Supplemental Force powers

Enabled 74 additional choices from 72 pages. All 88 inventoried official
Force-power pages now have selectable mappings, yielding 90 choices. Dark
Transfer and Force Storm each retain separate, book-qualified versions. Corruption
and Intercept import only their Force Power sections; the existing Corruption
Destiny article and mechanics remain unchanged. Full articles, descriptors,
printed activation times and source revisions are retained.

Twenty-four Lightsaber Form powers require an activated, wielded Lightsaber.
Inventory saves activation independently of equipment selection. Inactive blades
cannot attack or grant Niman's wielded-Lightsaber defenses; another active blade
can satisfy those requirements. Legacy equipped blades remain active unless
explicitly deactivated. Form powers have no added proficiency or form-talent
learning prerequisite. Their category's Rebuke exceptions are recorded, but
counterspell resolution is not yet automated.

Enlighten offers its printed Reaction/Swift Action alternatives per suite copy.
Ordinary activation, spent tracking, dark-side increments, Force Point recovery
and natural-20 suite recovery use the existing shared rules. Per-power effects,
targets, sustain costs, mandatory special costs and conditional return-to-suite
exceptions remain pending; a selectable power does not imply those effects are
automated.

Validation: 463 JavaScript tests and 27 Python importer tests; focused Chromium
and Firefox checks cover all 90 choices, mixed-page/version isolation, complete
text search, active/inactive blade guards, action persistence, spent copies,
Dark Side Score, Force Point recovery and Dracula mobile layout.
The full Chromium regression passed, the offline import/rebuild is byte-identical,
and all previously enabled mechanical records are preserved.

## Rebellion Era feats

Enabled all 60 inventoried Rebellion Era feat pages with pinned complete articles,
explicit printed prerequisites and reviewed heroic class bonus lists. The feat
catalog now contains 214 options. Species feats remain general selections unless
the class's printed bonus list explicitly includes them; category and list
membership agree for this batch.

Fourteen feats connect to shared calculations and controls. Fast Surge changes
Second Wind to a Free Action on the character's turn; Unstoppable Combatant removes
the encounter limit while preserving daily/Exhaustion accounting. Vitality Surge
removes the half-HP gate, Recovering Surge restores one Condition Track step unless
a persistent condition prevents it, and Resurgent Vitality adds twice the
Constitution bonus, minimum 2. Existing ordinary recovery behavior is preserved.

Devastating Bellow adds a base damage die. Strong Bellow is optional and spends
one use per encounter, including a zero-cost basic Bellow. Its saved use survives
reload, New Encounter restores it, and the optional Helpless cap includes its
cost reduction. The default still permits arbitrarily large extra-die purchases.

Fast Swimmer increases native Swim Speed before movement restrictions; Deep Sight
supplies Darkvision to the sheet, targeting and stat block. Flawless Pilot, Forest
Stalker, Hunter's Instincts, Perfect Intuition and Perfect Swimmer change existing
rerolls to keep the better result without granting another reroll.

Remaining effects include target-specific triggers/defenses, temporary Force
Points, Regenerative Healing, Jedi Heritage's power-slot adjustment, natural
claws, Bonus Hit Points, conditional skill/vision benefits and vehicle actions.
These options retain their full mechanics; selection does not imply their effects
are automated.

Validation: 474 JavaScript tests and 27 Python importer tests cover class lists,
prerequisites, ordinary recovery regressions, daily/encounter accounting,
minimum healing, persistent-condition restrictions, helpless guards, saved
Bellow use/costs, unlimited pools/capped alternatives, reroll retention and senses.
Focused Chromium/Firefox checks cover selection, exact source popups, recovery
actions, saved encounter limits, rerolls and Dracula mobile layout. Browser
validation now schedules independent feature checks with three workers; worker
limits and draining after failures have dedicated regression checks.
The full Chromium suite passed with three workers. Offline rebuilding preserves
identical data, and existing mechanical records are unchanged apart from additive
heroic bonus-feat lists. The coverage report now separates selectable entries from
wiki-page mappings.


## Character Creation level planner

Creation now opens on a chronological Levels table, with separate Abilities,
Species, Skills, Equipment and Character tabs. Target levels from 1 through 20
create saved pending rows; class, feat and talent cells open the shared
prerequisite browser. The table separates heroic feats, class feats, class talents,
ability increases and Misc choices such as Force Techniques and powers. Starting
proficiencies are grouped with full source articles behind their controls.

The existing progression engine supplies each row's cumulative BAB and class-local
schedules. Prestige entry uses the preceding level's context and explicit
confirmation for campaign-dependent requirements. Later selections survive edits
to earlier choices and are revalidated; invalid classes and pending rows grant
no levels, HP, BAB or natural-healing bonuses. Species changes also invalidate
forbidden classes. Class and Level remain visible during horizontal scrolling.

Validation includes 481 JavaScript tests and 27 Python importer tests, focused
Chromium/Firefox scenarios for higher-level builds, multiclassing, prestige entry,
secondary choices, ability increases, Force Techniques, persistence and mobile
layout. Existing browser checks now navigate the named tabs and row pickers.
The full Chromium browser regression passed, including all 43 independent
feature checks. The new planner modules are included in the hosted offline cache.

## Remaining official feat selections

Added the remaining 144 inventoried official feat pages as selectable records:
358 feat options now represent all 351 official feat pages in the captured
inventory. Each keeps its complete pinned article, source revision/history,
printed typed prerequisites, repeat rules and heroic class bonus-list membership.
No new feat effect calculations are claimed by this batch. Existing mechanical
fields are unchanged, apart from additive bonus-feat lists and coverage metadata.
The Scout list explicitly includes Tech Specialist despite the feat page lacking
that category tag; the printed list takes precedence for class access.

Droid Focus, Nikto Survival and Superior Tech have finite secondary choices.
Relentless Attack, Savage Attack and Return Fire use the existing weapon-group
and exotic-weapon choices, including their printed prerequisite choices. Logic
Upgrade: Skill Swap excludes Use the Force and trained skills. Adaptable Talent
and Recurring Success accept a saved manual choice, allowing references to options
whose own catalog import is still pending. Starship Tactics includes its printed
Gunnery Specialist prerequisite exception; maneuver suites remain manual.

Requirements that depend on unmodeled droid systems, implants, campaign permission
or membership retain their exact source wording and require a saved confirmation.
Known prerequisites still apply, and unconfirmed selections do not contribute to
progression. Changing a prerequisite preserves later selections and invalidates
their contributions normally. Manual choices and confirmations survive reload and
character export/import.

Current options have explicit Manual or Partial coverage metadata. These labels
refer to effect handling, not selection or prerequisite checks. Partial is a
conservative statement that some behavior is implemented, not certification that
the whole article is automated. No label drives a calculation or replaces the
complete rules text.

The expanded graph exposed repeated whole-graph crossing counts during adjacent
swaps. Cached rank-overlapping pairs and incident-pair deltas preserve the exact
layout decisions. Cached neighbor lists and segment bounds reduce repeated scans;
repeated DOM layouts reuse geometry while dimensions and topology are unchanged.
A comparison against the previous implementation matched all positions, routes and
crossings for 30 generated graphs and the full 652-node/429-edge catalog graph.
On this machine the catalog layout fell from 55.6 seconds to 1.3 seconds. This is
a measured example, not a cross-device performance guarantee.

Validation: 491 JavaScript tests and 27 Python importer tests pass. The complete
Chromium browser regression, including 44 independent feature checks, passed.
Focused Chromium and Firefox checks cover exact source text, manual and enum
secondary choices, prerequisite confirmation, invalidation, save/reload and
Dracula mobile layout. The reference validator confirms all 4,400 pinned articles
with 367 excluded pages. Offline recompilation is deterministic, and an explicit
comparison confirms existing mechanical fields are preserved.


## Additional species, fixed traits

Advozse, Aleena, Altiri, Amani, Anarrian, Arcona and Arkanian now have selectable
records tied to their pinned full articles. Ability adjustments, size, normal
speed and automatic languages follow those articles. Existing reviewed records
are unchanged. Advozse retain the printed language name Advb.

Existing typed fields implement Advozse natural armor, Low-Light Vision and
Perception rerolls; Aleena Acrobatics rerolls; Altiri bonus starting training;
Amani Fortitude, climbing Take 10 and Primitive starting-feat exclusions; Anarrian
bonus starting feat; Arcona Fortitude and Scent; and Arkanian Darkvision.

Partial markers remain conservative. Quick Energy, Visually Striking, Amani
Reach/Roll, Strength Surge, Flash of Genius and Intellectual Reputation retain
their complete source wording for manual resolution. No temporary or situational
bonus is turned into a permanent modifier. In particular, the optional Arkanian
Persuasion ability substitution is not applied automatically.


## Species class-skill access

`bonusClassSkills` is defined in the data contract before use in calculations.
It contains skill IDs and changes availability only. It is not bonus training.
Creation, Skill Training eligibility and later training use the same union of
class, Background and species skills. Replaying after a species change preserves
saved choices but removes training that is no longer legal.

Added pinned species: Anzati (Stealth, Survival), Cathar (Climb, Stealth),
Nosaurian (Climb), Nyriaanan (Survival), Shistavanen (Survival), and Yarkora
(Gather Information). Mrlssi remains pending because its separate bonus
Knowledge training needs a creation choice, not an unrestricted training slot.

Fixed scores, sizes, speeds and automatic languages are mapped. Nyriaanan's
bonus starting Feat and Low-Light Vision, Shistavanen's conditional Skill Focus
and Initiative reroll, Nosaurian's Survival reroll, Anzati's Low-Light Vision and
Yarkora's Deception reroll use existing reviewed fields. Natural Weapons, Reactive
Claw, Mesmerize, Presence Sense, Soup Drinking and Confusion retain full source
text and remain manual. All six records carry Partial markers.


## Fixed-stat species catalog expansion

Added 67 official species with fixed printed ability modifiers, sizes, normal and
alternate movement speeds, automatic languages and complete pinned articles.
Species coverage is now 102 of 132 inventoried pages, with 104 selectable entries
including the existing book variants. Existing species mechanics are unchanged.

The fixed-stat review excludes narrative ability names from numeric modifiers:
Gand keep +2 WIS, Massassi keep +4 STR, and Lugubraa have no inherent INT penalty.
Lugubraa Learning's age-dependent cap and increase remain in their full rules for
manual resolution. Celegian have no printed ground speed; the record grants
Fly 6 and Swim 10, with no invented walking speed. Skakoan language capabilities
and Ubeninal sign language are retained explicitly. No unspecified languages are
assigned to fill an omission.

Existing typed fields cover printed natural armor, unconditional starting Feats,
conditional Skill Focus, Primitive exclusions, Chiss bonus training, vision,
underwater breathing, selected rerolls/Take 10, breath holding, and the exact
Chistori/Mantellian Savrip Rage rules. Gand's published 1d10-day limb regeneration
reuses the existing subsystem and now links to Gand's source instead of Trandoshan's.

New data-contract fields cover innate DR, fixed species Damage Threshold bonuses
and native-flight restrictions under Heavy Load. Chistori, Givin and Nautolan DR
feeds both the HP display and incoming damage. Stereb's +5 threshold bonus is
separate from its Fortitude bonus; its stone-only Skill Focus remains manual.
Celegian and Toydarian cannot fly under Heavy Load. A nonexistent ground movement
mode remains absent when speed bonuses or encumbrance would otherwise grant
movement. Other existing encumbrance rules are unchanged.

All new records remain Partial. Natural weapons, conditional/special attacks,
other situational traits, special senses, aging, and exceptional healing/death
interactions require further automation. In particular, Gen'Dai's doubled
threshold for death is not applied to the general threshold display or automated
damage resolution. Full source text remains the authority for manual resolution.

The remaining 30 pages need book variants, explicit creation choices, restricted
automatic Feat grants, droid physiology, or unresolved source details. Sorcerer of
Rhand is held until its bonus Force Training's descriptor restrictions are
represented; it is not imported as an unrestricted power suite.

## Separate species book versions

Added 20 selectable versions from ten official species pages: Bith, Chadra-Fan,
Dug, Geonosian, Jawa, Kaminoan, Krevaaki, Noghri, Umbaran and Zeltron. Each uses
the name `Species (Book)`, its own pinned source section and one isolated trait
set. Common descriptions and characteristics remain available. The importer now
preserves these book tabs on subsequent imports. Coverage is 112 of 132 species
pages, with 124 selectable entries. Existing species records are unchanged.

Fixed printed scores, sizes, speeds, automatic languages and supported traits
are mapped independently for each version. In particular, the two Geonosians
retain different flight speeds, languages and starting Feats; the two Noghri
retain different walking speeds and Feat grants. Neither Noghri article names a
second automatic language, so both receive Honoghran only. Other special traits
remain manual with full source text and Partial markers.

The new `conditionalStartingFeats` contract covers nonrepeatable Feats without
secondary choices, manual prerequisites or immediate resource/training effects.
It checks prerequisites during level-one replay, grants no selectable slot and
never grants the Feat retroactively from later ability improvements. Noghri
(Force Unleashed Campaign Guide) receives Running Attack when its actual
Dexterity 13 prerequisite is met at first level. Running Attack has no Base
Attack Bonus, Dodge or Mobility prerequisite. Existing conditional Skill Focus
grants continue to follow training eligibility.

Species prerequisite popups show the character's selected book version when
applicable. Otherwise they retain every matching version rather than silently
choosing one. Unit and browser checks cover isolated source articles, version
switches, automatic grants, first-level eligibility, later ability improvements,
editing an earlier score, save/reload and mobile layout.

The remaining 20 species pages need explicit creation choices, more complex
automatic grants, droid physiology or source details that cannot safely be
inferred. They remain in the embedded reference library while those data
contracts are developed.

## Species creation choices

The data contract now represents saved, single-selection ability profiles,
automatic languages and conditional Skill Focus choices. None has an implicit
default. Selected modifiers are added to fixed species modifiers without
altering the generated score pool, and only the chosen automatic language is
added. Choices are preserved independently for each species when switching.
Conditional Focus requires training in an offered skill and consumes no Heroic
Feat slot. If another offered skill is trained after an earlier edit, an invalid
saved selection remains visible and is reported in Unresolved Choices.

Added four pinned official species with their complete articles:

- Arkanian Offshoot: -2 CON and a choice of +2 STR or +2 DEX. Its one Skill Focus
  choice is limited to trained Endurance, Mechanics, Pilot, Survival or Treat
  Injury. Determination remains manual.
- Devaronian: the printed male/female ability profiles are explicit choices,
  independent of the narrative Gender field. Training, scores and prerequisites
  replay from the selected profile. Conditional Skill Focus (Deception) uses the
  existing training-dependent grant. Natural Curiosity remains manual.
- Nikto: +2 STR, -2 INT, -2 CHA, +2 Fortitude, +2 Natural Armor and the printed
  Survival reroll. Automatic Nikto is supplemented by Basic or Huttese, chosen
  explicitly. The selected language appears on the sheet and in the stat block.
- Vultan: +2 INT, -2 WIS, one additional first-level class-skill training slot,
  and one Skill Focus choice limited to trained Knowledge fields. Basic and
  Dromnyr are automatic languages. Untrained/non-class skill selections never
  qualify for the conditional bonus.

All four retain Partial markers. Species coverage is 116 of 132 pages (87.9%),
with 128 selectable entries. Existing mechanical records are unchanged. The
level table now includes secondary choices in automatic Feat labels, such as
Skill Focus (Mechanics). The new module is included in the offline shell.

Unit and browser checks cover earlier-level edits, prerequisite changes,
conditional grant timing, training eligibility, per-species persistence, manual
choice clearing, exclusive languages, stat blocks, mobile themes and offline
reload. A pre-existing missing ID definition in the published JSON Schema was
also repaired; the complete compiled pack validates against that schema.

## Species bonus training and first-level Feat choices

Added Mrlssi and Tof with complete pinned articles and explicit saved creation
choices. Coverage is now 118 of 132 species pages (89.4%), with 130 selectable
entries. Existing mechanical records are unchanged.

Mrlssi receive +2 INT, +2 CHA, -2 STR, Small size, Speed 4, Basic and Mrlsstese.
Mechanics is always a class skill, and trained Persuasion grants Skill Focus.
Scholarly Inclination grants one chosen Knowledge field at first level, even
outside the class skill list. This uses the new `trainedSkill` choice kind and
`startingTrainedSkills` resolved field, independently of ordinary training.
The skill appears in the level table, sheet and stat block without inventing
possession of the Skill Training Feat. Its origin is tracked in
`ctx.speciesTraining` and marked beside its locked training control. A duplicate
ordinary selection remains editable, with an explicit validation error, so it
can be replaced without silently changing the saved build.

Tof receive +2 STR, +2 CHA, -2 DEX, -2 WIS, Large size, Speed 6 and Tof language.
A new `startingFeat` choice kind offers Rapid Shot or Rapid Strike. It follows
their normal BAB +1 prerequisites and reuses the existing first-level
conditional grant mechanism. Eligible choices grant no extra selectable slot;
unavailable choices stay visible. A later BAB increase cannot qualify the
first-level gift retroactively. Mighty Swing uses its printed STR 13
prerequisite at first level, independently of the selected Feat. Fearless's +5
Will against Fear/Intimidate remains manual in the full article; no permanent
Will bonus is invented. Both species retain Partial markers.

Tests cover class-independent training, pool accounting, duplicate replacement,
conditional Focus, level-zero drafts, first-level BAB/STR boundaries, later
advancement and earlier edits, repeated grant prevention, source text, stat
blocks, persistence, mobile themes and offline reload.

## Conditional Feats gained during progression

Added Codru-Ji, Gran and Sluissi, with pinned full articles and Partial markers.
Species coverage is now 121 of 132 pages (91.7%), with 133 selectable entries.
The new `conditionalFeats` field uses the same restricted plain-Feat contract
as `conditionalStartingFeats`, with no first-level limitation. Grants retain
their actual acquisition level and consume no selectable slot. A fixed-point
pass resolves prerequisite chains without duplicating Feats or inventing
effects for circular requirements. Level-zero drafts earn no grants.

Codru-Ji have no ability modifiers, Medium size, Speed 6, Basic and Codruese.
They gain Dual Weapon Mastery I when DEX 13 and BAB +1 are met, including on later
levels. Four-arm wielding, including two two-handed weapons, and the +5
Grab/Grapple bonus remain manual. The current Full Attack grip checks do not
yet implement their extra hands; the source text does not grant extra attacks.

Gran have +2 CHA, -2 INT, Medium size, Speed 6, Basic, Gran and Darkvision.
Point-Blank Shot grants Precise Shot whether gained as a starting Feat or during
later advancement. Innate Accuracy's once-per-encounter Swift Aim and Target
Awareness's first-50-square Perception exception remain manual.

Sluissi have +2 INT, -2 DEX, Medium size, Speed 6, Basic and the printed
Sluiussese language. Real Mechanics training grants Tech Specialist, including
training gained later through Skill Training. The current authoritative Feat
requires trained Mechanics only; no INT 15 prerequisite is invented. Careful
Worker, Serpentine running starts and the conditional stability bonus remain
manual.

Tests cover later BAB, ability improvements, starting and selected Feats, real
versus invalid training, earlier edits, actual acquisition levels, conditional
chains, circular requirements, duplicate prevention and complete source text.


## Supplemental class and common Force talent catalog

Enabled all 1,036 isolated talent sections on 146 official tree pages, bringing
the selectable catalog from 194 to 1,034 mechanical options. The two shared
Multiattack Proficiency reprints retain both source articles and tree memberships.
Existing mechanical IDs, source pins and effects are preserved; only Rifles'
additional Carbineer membership changes an existing talent record.

The five heroic and 32 prestige access lists are checked against their explicit
pinned overview tables, independently cross-checked against source categories.
Heroic tree counts are Jedi 4, Noble 16, Scoundrel 14, Scout 14 and Soldier 13.
Light Side and Guardian Spirit join the four Core common Force trees. Tradition
membership and degree-specific droid access remain pending for 31 other pages.

The 840 added options have Manual effect coverage and empty effect lists. Source
sections retain their own book attribution, nested special rules and relevant
tree-wide restrictions. No AI-generated summaries replace their mechanics.
Punctuation is normalized only at display time. Exact page-and-section links
resolve locally without conflating reprints or unrelated identical names.

The importer recognizes prerequisite conjunctions, alternatives, existing feature
identities, ability scores, Base Attack Bonus, levels, trained skills, species and
supported secondary-choice conditions. Feature names containing 'and' or 'or'
remain intact. If a conjunction contains an unmodeled requirement, its known
conditions still apply. If an alternative is not fully modeled, the complete
alternative stays manual; the parser does not require just its recognized branch.
The 34 new options with unverified requirements require explicit saved
confirmation. Examples include Inquisitorius membership, tree talent counts,
languages, armor proficiency context and specific weapon-focus interpretations.

Twenty new talents expose permanent secondary choices. Vehicle Focus uses its
six printed vehicle types. Accurate Blow limits weapon groups and Exotic Weapons
to the printed melee choices. Close Contact, follower talents and Sentinel Strike
retain their printed selection limits; temporary targets and per-item crafting
choices remain in the rules text. Nine newly enabled heroic Jedi talents retain
the existing Jedi Counseling activation restriction and its RAW off-state.

Light Side acquisition records DSS 0 explicitly. Increasing DSS preserves the
selection as inactive and prevents it from supplying prerequisites; returning to
zero restores it. This mirrors existing Dark Side acquisition history in the
opposite direction. Imperial Inquisitor's tree-wide selection requirements stay
manual; no continuing DSS-based suppression is invented for that tree.

Further automation must handle permanent dependency grants such as Watchful Step,
Engineer Lineage, Dark Deception, Commanding Presence and Stolen Form. Numeric
bonuses, activated actions, followers, vehicles, crafting and encounter timing in
new options remain manual. Trigger Work also needs a separate audit against the
Gunslinger tree's weapon restriction. This batch does not claim these effects are
automated or that every RAW build can already resolve all dependent choices.

Validation covers every isolated section and class access table, parser failure
cases, local link identities, reprints, Light Side history/inactivity, repeat caps,
secondary choices, manual confirmation and persistence. All 539 JavaScript tests and 35 Python importer tests pass, as do the full
Chromium browser regression, focused Firefox checks, the closed schema and all
4,400 reference-article checks. Repeating the talent import and compilation is
byte-for-byte identical; a captured full catalog reimport preserves existing
catalog IDs, talent IDs and effect mappings.


## Permanent grants in supplemental talents

Watchful Step now supplies Initiative training and a Perception substitution.
Engineer Lineage supplies fixed Mechanics training after its Educated/Knowledge
prerequisites. Neither consumes a normal training choice. Removing a prerequisite
or grant removes the training it alone supplied and invalidates later dependent
feats; independently acquired training remains.

Dark Deception adds Deception class-skill access, while Commanding Presence adds
Persuasion access. These do not train the skill, change DSS or apply their
conditional/activated effects. Access begins when the talent is acquired. The
initial skill picker retains its earlier availability snapshot, and neither these
grants nor a later talent can retroactively qualify earlier training or feats.
Previously earned access can qualify a later Skill Training feat or training
from an Intelligence increase.

Stolen Form now chooses among the twelve Lightsaber Forms talents. The picker
shows unavailable forms disabled and supplies the full chosen form article. It
requires an already earned Force Technique, Lightsaber focus and the chosen form's
own prerequisites. It grants that form's possession and supported effects without
another slot, keeps its source level/class and parent origin, and never grants a
duplicate copy. Removing/changing Stolen Form replays its granted form and later
prerequisites. A fall below the Sith class's required DSS suspends both parent
and granted form. Wisdom increases apply that suspension before later choices.

Saved exact manual form names such as `manual:Ataru` resolve to the known form
without changing the character file or losing its original text. Unknown names
remain saved and ineligible. No guessed forms, nested grants or secondary choices
are manufactured. These five talent records now have Partial coverage; their
unmapped conditional actions, installation timing and other effects remain manual.

The data contract defines fixed `trainedSkill` and `classSkill` talent effects,
explicit `chosenTalent` effects, source-tree secondary choices and `classChoices`
prerequisite counts. Runtime/data validation rejects missing skill references,
unsupported child trees, repeatable/parameterized children and invalid counts.
Validation includes chronological grants/removal, old names, source popups,
secondary controls, dependency replay, class inactivity, saves, themes and mobile.
All 549 JavaScript tests, 35 Python importer tests, the full Chromium suite with
54 independent helpers, focused Firefox checks, the closed schema and all 4,400
reference articles pass.

## Force Tradition talent access

Enabled all 122 sections on the remaining 26 Tradition Talent Tree pages. The
catalog now has 1,156 talent choices on 172 of 177 inventoried tree pages. New effects remain Manual except for Many Shades of the Force (Partial), whose
descriptor removal feeds the existing activation/DSS code. Shared tree admission text is retained in each talent
article, with full membership articles available from creation and the graph.

Membership supports multiple traditions and a joining level. Typed species,
training, Force Sensitivity and acquisition-DSS checks supplement the declared
narrative admission requirements. Joining later cannot authorize earlier talents;
removing membership invalidates dependent choices without erasing them. Source
membership prose overrides abbreviated overview requirements: outsiders are
explicitly possible for Aing-Tii Monks, the Ember of Vahl, the Tyia, Shapers of
Kro Var, Disciples of Twilight and the Korunnai. Do not impose extra species or
birthplace restrictions from shorthand when those descriptions give alternatives.

Many Shades of the Force has a permanent secondary power choice restricted to a
known Light Side or Dark Side power. It removes that descriptor from all suite
copies, and restores it if the talent becomes invalid; the shared source/catalog
remains unchanged. Shadow Armor and Wan-Shen Defense retain
printed repeat caps. The importer supports an explicit --traditions mode and
preserves existing IDs/effects on rerun. Remaining unsupported prerequisites keep
exact wording and require confirmation, including named exotic weapon requirements
whose equipment is not imported yet. Droid degree trees remain pending.

Validation: 559 JavaScript tests, 36 Python tests, closed-schema validation,
all 4,400 reference articles, deterministic repeated import/compilation, a full
catalog reimport preserving prior IDs/effects, the full Chromium regression with
55 independent helpers, and focused Firefox checks pass. Browser checks include
actual DSS spending with/without Many Shades, membership timing, saved choices,
full source popups and mobile themes.

## Bacta and mixed-version equipment purchase facts

Bacta Tank revision 21876 supplies Empty (100,000 credits, 500 kg), Full
(130,000 credits, 1,100 kg), and Bacta (per liter, 100 credits, 2 kg).
The superscript on the bacta row is a footnote, not part of the quantity.
The full tank includes 300 liters; buying a full tank does not add a second
bacta inventory stack. Treatment, depletion and tank contents remain Manual.

Camouflage Netting revision 19835 keeps Clone Wars Campaign Guide
(6,000 credits, 40 kg) and Galaxy at War (2,000 credits, 5 kg) versions
separate. The former discusses powered and unpowered netting without separate
prices; it is not split into invented price profiles. Conditional Stealth
benefits, deployment and power duration remain Manual.

Holoshroud revision 19461 keeps General Equipment (25,000 credits, 0.5 kg)
separate from Armor Upgrade (5,000 credits, Restricted, Rare). The upgrade has
no stated standalone weight; it does not inherit the general item's weight.
The existing licensing and market rules apply to the selected version.
Installation, upgrade slots and illusion effects remain Manual.

Original unspecific IDs remain available as Unspecified and cannot be bought
at a guessed price. Saved possessions and weight overrides keep their identity.
All versions retain their full pinned article and original wiki links.

## O'reenian, Phindian and Miraluka

Three additional pinned species are selectable with full original articles.
O'reenian has no ability adjustments, Speed 6 and O'reenian as its automatic
language. Its Perception and Endurance rerolls use the replacement result even
when worse.

Phindian has +2 Intelligence, -2 Charisma, Speed 6, Basic and Phindian. Its free
Skill Training (Knowledge (Technology)) is recorded as an actual bonus Feat and
trains the skill independently of the regular pool and class list. Mechanics
training grants conditional Skill Focus (Mechanics). Neither grant consumes a
Heroic Feat slot.

Miraluka has +2 Intelligence, -2 Dexterity, Speed 6, Basic and Miralukese.
Training Use the Force grants one bonus Force Training, alongside any instances
selected normally. Power slots, later Wisdom increases and acquisition levels
replay automatically. The full Force Sight text remains available. Its living
surroundings, Force-invisible targets and Force-suppression conditions remain
Manual; it is not replaced with unconditional Darkvision.

All three retain Partial markers. These additions leave eight inventoried
species pages without selectable profiles: Killik, Near-Human, Rakata, Replica
Droid, Republic Clone, Shard, Sorcerer of Rhand and Ssi-Ruu. Droid creation,
size profiles and restricted grants still need their own data contracts.

## Rakata and Ssi-Ruu

Rakata revision 19296 adds +2 Intelligence, -2 Wisdom, Speed 6, Rakata language,
Primitive starting proficiency exclusions, Rage and its daily recovery. Ancient
Knowledge changes weapon nonproficiency from -5 to -2 and unproficient armor
penalties to Light 0, Medium -2 and Heavy -5. Other penalties remain applicable.
A saved bonus Weapon Focus choice offers Simple Weapons or an inventoried exotic
melee weapon. It becomes active when the printed proficiency condition is met,
including proficiency acquired at a later level. It consumes no Heroic Feat slot.
Rakata cannot acquire Force Sensitivity but retain Force Points. Its once-per-
encounter trained-only skill application and Rakatan weapon conversions remain
Manual; their complete source text is retained.

Ssi-Ruu revision 27391 adds +2 Strength, -2 Wisdom, Speed 6, Ssi-Ruuvi, +2 Natural
Armor and conditional Skill Focus (Persuasion). Force Sensitivity, Use the Force
checks and Force Points are independently prohibited. This does not provide
immunity to Force powers, talents or skill effects. Keen Smell offers a
keep-the-better Persuasion reroll for a target within 6 squares in the same room
or open area; the player asserts the scope when using that control.

Both profiles are Partial. Six inventoried species pages remain without profiles:
Killik, Near-Human, Replica Droid, Republic Clone, Shard and Sorcerer of Rhand.

## Republic Clone

Republic Clone revision 20034 is selectable with its complete original article.
It starts from STR 15, DEX 13, CON 10, INT 12, WIS 10 and CHA 8, with one explicit
+2 ability choice. Its Medium size, Speed 6, Basic language, bonus Feat and extra
trained class skill follow the printed traits. It is not restricted to Soldier
or Scout by the descriptive discussion of common Clone careers.

Fixed starting scores override ordinary generation for calculations and
prerequisites. The normal pool, assignments, method and budget remain saved for
switching species. The builder and sheet show the fixed bases; the +2 choice is
shared by the Species and Abilities tabs. Advancement, Constitution-based HP,
Intelligence-based skill slots, equipment bonuses, stat blocks and save/reload
use the resulting scores.

Five inventoried species pages remain without selectable profiles: Killik,
Near-Human, Replica Droid, Shard and Sorcerer of Rhand.

## Natural weapons and Killik

Printed claws, horns, beak, bite and tail attacks are available for Cathar,
Nosaurian, Shistavanen, Barabel, Ishi Tib, Mantellian Savrip, Talz, Trianii,
Whiphid, Yevetha and Yuzzem. Each attack preserves its printed damage and type,
even where a Large species prints 1d6. Martial Arts advances the natural die
from that base, following the Martial Arts I FAQ. Natural weapons count as armed
for opportunity attacks without requiring Martial Arts I. Merely possessing
several natural weapons does not grant extra attacks.

Killik defaults to Medium. Its optional GM size profiles preserve all nine
printed rows, including ability adjustments, Speed and natural damage. The
Multiattack trait reduces the aggregate multiple-attack penalty by 2. Hive Mind,
Joiners and additional GM-assigned qualities remain manual. Fine natural damage
is the printed constant 1, with normal minimum damage and extra-die handling.
Ordinary unarmed attacks outside Small, Medium and Large remain manual because
the Core unarmed table provides no damage for those sizes. Armor prices and
weights outside those three sizes also remain manual; no scaling is inferred.
Explicit armor sizes participate in fit checks; older untagged inventory retains
its existing interpretation. Lugubraa natural damage remains manual because the
article prints ambiguous dice and does not specify the damage type.

Natural attack references survive saves and species changes. Character copies
and imports rebind their routine and planned-action references to the new
character. Modifiers are separate for claws, bite, horns, beak and tail, and do
not alter the ordinary unarmed attack. Full attacks, opportunity attacks, Cleave,
Actions and stat blocks use the same derived natural attacks.

## Near-Human customization

Near-Human revision 26005 supplies 24 traits and 10 cosmetic variants. The
character replaces either the Human bonus feat or bonus trained skill and
selects one trait and one to three variants. Original table descriptions and
wiki links are retained verbatim. Ability Adjustment selects distinct increase
and decrease abilities, applying +2/-2 without changing generated base scores.
Existing feats and ordinary training remain saved when changing the replaced
bonus; excess selections become unresolved choices instead of being deleted.

Additional Arms reduces the aggregate multiple-attack penalty by 2 without
granting attacks. Conductive supplies a 1d6 Energy natural attack; Natural Weapon
supplies 1d6 Slashing claws. Natural Armor, Quick, Darkvision, Low-Light Vision,
Naturally Acrobatic, Expert Swimmer, Heightened Awareness, Persistent and Weapon
Familiarity reuse the reviewed species calculation/control paths. Naturally
Acrobatic grants training outside class lists without spending the ordinary
pool or inventing a Skill Training feat. Cosmetic variants add no size or other
bonuses. Scent's range and underwater breathing are recorded; contextual checks
and drowning are not automated by recording those traits.

Climate Adaptation, Empath, Quick Healing, Resistant, Spring Step, Strength
Surge and Visually Striking retain Manual markers for their conditional or
activated effects. Biotech Augmentation and Cultural Cybernetics record an
explicit implant choice and show its full rules; installation, derived implant
effects and inventory synchronization remain manual. These choices do not
silently buy equipment, charge credits, or perform surgery. Primary traits and
all secondary selections remain available and survive species changes and
save/import. Species Features and printed stat blocks include selected traits,
secondary options and cosmetic variants.

Bio-Implant redirects to Category:Bio-Implants (revision 20354). Cybernetics
redirects to Category:Cybernetics (revision 26008). The reviewed membership
snapshot supplies seven Bio-Implants and nineteen cybernetic options across
Cybernetics, Advanced Cybernetics and Implants, all already imported official
gear records. No Homebrew options or effects are included. The snapshot informs
option lists without substituting category prose for individual item mechanics.

## Custom Droid creation and degree talents

Droids revision 26658 supplies the Custom Droid rules. The player selects one
of five degrees, Small or Medium size, and a designer-chosen understood language.
Degree and size adjustments stack, and adjusted scores are never below 1.
Small custom droids have speed 4 and the printed three-quarter carrying factor;
Medium custom droids have speed 6. The five-score standard package and 21-point
budget are independent of organic generation. Rolls generate five scores.
Constitution remains absent rather than becoming a score of zero. It grants no
HP or skill modifier, cannot qualify for a Constitution prerequisite, cannot be
increased, and receives no equipment bonus. Strength supplies Fortitude.

Custom droids have their stated Heuristic Processor, which removes the normal
restriction on untrained checks. Nonheuristic droids retain the four Core
exceptions. Custom droids cannot choose Jedi or gain Force Sensitivity or Force
powers; their Force Points remain available. Existing droid Stun/Ion handling,
disabled terminal state and repair-oriented recovery apply. Designer language
understanding is displayed separately from spoken languages. No vocabulator or
additional spoken language is inferred.

All 35 talents in the five degree trees are selectable with complete pinned
articles. The selected degree grants its tree in addition to class trees.
Task Optimization has a trained-skill secondary choice. Heavy-Duty Actuators
requires Medium or larger size. Four complex/equipment prerequisites remain
explicit manual confirmations: Scomp Link Slicer, Supervising Droid, Just a
Scratch and Weapons Power Surge. Talent effects are marked Manual rather than
claiming effect automation. Import with `python tools/import-talents.py --droids
--apply`; the targeted mode preserves existing mechanical records and formatting.

The starting Heuristic Processor, two arms, and size-dependent locomotion are
specified in the embedded source. Additional starting systems use a separate
allowance of up to 1,000 credits, with no retained balance; this allowance,
system upgrades and their non-speed effects are not yet automated. In particular,
Tracked's difficult-terrain exemption and Climb penalty remain manual. Maintenance,
reprogramming, shutdown, detailed immunities and other system interactions remain
on the follow-up queue. No unreviewed system prices, installation effects or
extra equipment are inferred. Standard models, stock chassis, Replica Droid
and Shard creation remain separate pending work.

### Droid System catalog and pricing

Imported 109 official pinned system pages and four category tables as 133
equipment profiles, including 15 built-in armor profiles. The importer checks
the official reference index and exclusion list, preserves revision pins and
exact articles, scopes Jump Servos to its Droid System section, and groups the
printed translator, remote processor, shield, hardened-system and image-disguiser
variants. Repeating the import makes no data changes.

The purchase resolver now handles Cost Factor, locomotion speed squared,
additional-system fees, fixed and size-dependent weights, the Small-or-smaller
accessory weight exception, compartment capacity and ordinary license fees.
Each part retains its chosen size in inventory. An explicit locomotion system
number supplies the printed additional-system fee. A sixth or later system has
manual pricing because the source provides no further fee; it is not forbidden.
Built-in armor uses the existing armor calculations without movement slowdown,
retaining the Heavy Armor running limit. Organic bodies cannot gain its effects.

Unspecified prices and weights remain null. Remote Receiver's printed -500
credits is not treated as a purchase that creates credits. Extra Legs, Jump
Servos and other host-dependent upgrades retain Manual pricing until their
host/configuration is modeled. Published gear retains Manual effect markers:
purchasing a system does not silently install it or grant processor, appendage,
sensor or locomotion effects. Starting grants, the separate starting allowance,
installed-system controls and those effects remain the next implementation batch.

Validation covers all body sizes, the five printed locomotion fees, exact source
and catalog references, repeat imports, homebrew exclusions, compartment limits,
save validation and built-in armor speed/running. Browser checks cover sheet and
builder purchases, debit amounts, retained configuration, manual prices and
Dracula mobile. The worker caches the new resolver for offline use.
