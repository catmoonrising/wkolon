# Core Rulebook import review

This batch imports reference text; importing does not certify mechanical mappings.
The Rules library marks entries **Available** when at least one reviewed builder option exists,
and **Reference** when it does not. Available entries can still require manual
application of conditional effects. Reference-only entries grant no bonuses and
cannot be selected or purchased through the builder.

## Source conflicts and variants

| Entry | Finding | Treatment |
| --- | --- | --- |
| [Neimoidian](https://swse.miraheze.org/wiki/Neimoidian) | Core gives +2 INT, +2 WIS, −2 STR, Deception focus and Deceptive; Galaxy of Intrigue gives +2 CHA, −2 STR and both Deception/Persuasion focus. Languages also differ. The Core Deceptive sentence names a Twi’lek. | Preserve both labeled versions verbatim. Reference-only pending an explicit book/variant choice and review of the apparent copy error. |
| [Yuuzhan Vong](https://swse.miraheze.org/wiki/Yuuzhan_Vong) | Core has Technophobic; Legacy replaces it with Primitive. Both forbid Force Sensitivity and Force Points. | Preserve both versions; reference-only until species variants and Force restrictions are supported. |
| [Ithorian](https://swse.miraheze.org/wiki/Ithorian) | Characteristics names its language “Ithor”; Automatic Languages names it “Ithorese.” | Use the explicit Automatic Languages trait: Basic and Ithorese. Preserve both passages verbatim. |

These are different published versions, not permission to combine their benefits.
The wiki is a secondary transcription. Apparent errors need checking against the
published book and official errata before changing their wording or interpretation.

## RAW distinctions retained

| Rule | Consequence for implementation |
| --- | --- |
| [Weapon Focus](https://swse.miraheze.org/wiki/Weapon_Focus), Jedi Counseling | Proficiency with one weapon in a group can qualify; its bonus only applies to weapons with which the character is proficient. An explicit Weapon Proficiency feat prerequisite requires that actual feat. Existing group-only choices do not yet cover partial or exotic proficiency. |
| [Jedi](https://swse.miraheze.org/wiki/Jedi), Jedi Counseling | Multiclass Jedi does not inherently require Force Sensitivity. Talents requiring Use the Force or spending Force Points have additional restrictions; class membership alone must not grant them. |
| [Net](https://swse.miraheze.org/wiki/Net) | Uses grab/grapple rules, not damage dice. Missing damage must not become an invented damage value. |
| [Vonduun Crabshell](https://swse.miraheze.org/wiki/Vonduun_Crabshell) | No price is listed. Missing price is not zero credits; reference-only until ownership without a listed market price is modeled. |
| [Utility Belt](https://swse.miraheze.org/wiki/Utility_Belt), [Comlink](https://swse.miraheze.org/wiki/Comlink) | Several variants have distinct prices and weights. Preserve variant identity rather than averaging or choosing the first table row. Existing Standard belt and Short-Range comlink IDs stay unchanged. |
| Talent-tree pages | Core and Additional sections have different books. Individual talent records come from Core Talents headings only; complete tree reference articles retain their labeled supplementary sections. Existing selected supplementary talents remain available. |

## Remaining mechanical review

### Species batch

The builder now includes Aqualish, Cerean, Ewok, Hutt, Ithorian, Mon Calamari,
Quarren, Sullustan and Trandoshan, bringing the reviewed species total to 19.
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
