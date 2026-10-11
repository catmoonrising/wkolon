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
| [Weapon Focus](https://swse.miraheze.org/wiki/Weapon_Focus), Jedi Counseling | Proficiency with one weapon in a group can qualify; its bonus only applies to weapons with which the character is proficient. An explicit Weapon Proficiency feat prerequisite requires that actual feat. The optional Counseling switch supports partial proficiency for reviewed weapons, including Gungan Electropole familiarity. Individual exotic proficiency feats remain future work. |
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
its own saved switch; all default off. Unsupported combat, Force power, vehicle,
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

### Species batch

The builder now includes Aqualish, Cerean, Ewok, Hutt, Ithorian, Mon Calamari,
Quarren, Sullustan and Trandoshan, bringing the reviewed species total to 23 with the four separate Neimoidian/Yuuzhan Vong book versions.
Their source revisions are pinned separately from the imported text. Ability
adjustments, size modifiers, normal/swim speeds, languages, conditional Skill
Focus, Toughness, Primitive restrictions, natural armor and Hutt Force resistance
are calculated. The Hutt Will bonus is displayed separately against Use the
Force. Native-homeworld Background exclusions cover the newly selectable species.

Rerolls, sensory traits, Ithorian Bellow, limb regeneration and carrying limits
remain manual; their exact rules are in each species disclosure. Bellow is a
special attack against Fortitude, with a condition cost and half damage on a miss,
so it must not become an ordinary weapon attack. The new linked species feat
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
