# Attack ability contract

This contract precedes calculations. Noble Fencing Style uses Fencing Talent
Tree revision19131. Weapon Finesse, Weapon Sizes and Jedi Counseling112 supply
the existing DEX substitution, focused one-handed exception and unarmed/natural
classification. Keep these pinned articles verbatim.

`rules.attackAbilities` declares melee/ranged base abilities, permitted saved
ability choices, the unarmed Light classification's Counseling switch, and
reviewed replacement rows with source ID, record kind, ability, attack mode,
eligibility, proficiency requirement and the focused-one-handed permission.
Ability replacement is a choice of one modifier, never an additive typed bonus.
Auto preserves the current behavior by choosing the highest eligible modifier;
explicit choices may select a lower legal modifier. Normal damage abilities,
Power Attack, Ataru, two-handed damage and other attack modifiers are separate.

Noble Fencing Style permits CHA on proficient Light Melee Weapons or Lightsabers.
Use active chronological talent ownership and its trained Deception/Persuasion
prerequisites. Weapon Finesse permits DEX without an extra proficiency condition.
Its Combined Feat also permits a single wielded One-Handed weapon with Weapon
Focus. One-Handed is the printed size category; using that weapon with two hands
does not change its category. This permission applies only to Weapon Finesse;
it does not make the weapon Light for Noble Fencing, damage or other abilities.

Compare actual weapon size with current character size. Distinct equipped,
carried physical weapon entries declare wielded weapons; quantities do not
create extra wielded entries. Unarmed/natural attacks and worn Combat Gloves
are not extra held weapons. An inactive Lightsaber is not an active wielded
blade. Resolve Weapon Focus through the same effective group/familiarity rules
as the attack. Keep Ranged modes out of these two melee substitutions.

Jedi Counseling112 explicitly says Unarmed Attacks and Natural Weapons are Light
Melee Weapons. While its existing switch is enabled, use that classification
for both relevant substitutions. With it disabled, preserve the current RAW
size-based classification. The focused-one-handed exception remains feat-only.

Optional `character.attackAbilities` maps stable attack references to auto/STR/
DEX/CHA choices. Validate closed ability names, bounded maps and attack-reference
syntax without discarding choices when a weapon is unequipped or a prerequisite
is edited. If a saved choice becomes unavailable, retain it and block the attack
until a legal choice is restored; never silently roll using another ability.
Import and duplication must rebind the character's unarmed/natural references.
Show the control only when alternatives or a retained choice exist, in Options.

All attack consumers must use the same resolved modifier: ordinary attacks,
routines, Full Attack, Charge, opportunities, Running Attack, stat blocks and
saved-action replays. Cleave retains its original complete attack modifier under
the user's existing ruling. Invalid choices fail before actions/ammunition/FP.

Idealist (Ideologue Talent Tree revision25573) is reviewed in the same batch through the existing defense-ability
replacement effect: CHA may replace WIS for Will. It is not a defense bonus to
stack with WIS, does not change damage threshold's selected defense, and retains
the existing automatic/saved Will choice and chronological CHA13 prerequisite.
