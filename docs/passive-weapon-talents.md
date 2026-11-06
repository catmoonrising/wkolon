# Passive weapon talents

Contract for always-on weapon and armor effects. Sources are each record's pinned
article. Pinned revisions: Keen Shot16056, Hammerblow16372, Master of
Elegance19253, Multiattack Proficiency (Advanced Melee Weapons)19253,
Multiattack Proficiency (Exotic Weapons)26911, Flurry of Blows20981,
Blind Shot18231 and Knight Armor Mastery20227. Source articles and hashes
remain unchanged.

The new effects and prerequisite aliases belong only to these named records;
validation binds their exact source-defined shapes, including weapon and
concealment scopes. Knight Armor Mastery's aliases are exactly Armored Defense
and Improved Armored Defense, in addition to its own identity.

## Data

| Record | Effect |
| --- | --- |
| Multiattack Proficiency (Advanced Melee Weapons) | `multiattackReduction` 2 per selection, `advanced-melee-weapons` |
| Multiattack Proficiency (Exotic Weapons) | `multiattackReduction` 2 per selection, `exotic-weapons` |
| Flurry of Blows | `multiattackReduction` 2 per selection, `unarmed` |
| Master of Elegance | `lightMeleeDexDamage` |
| Hammerblow | `unarmedStrengthAttack` |
| Keen Shot | `concealmentPenalty`, Concealment |
| Blind Shot | `concealmentPenalty`, Concealment and Total Concealment, ranged Pistols and Rifles |
| Knight Armor Mastery | `countsAsTalents` Armored Defense and Improved Armored Defense |

## Resolution

- `exotic-weapons` matches a weapon whose resolved benefit identity is exotic.
  Benefits use the shared `weaponIdentityGroup` resolver, including the saved
  Jedi Counseling familiarity setting, for both this reduction and Blind Shot. `unarmed`
  matches Unarmed Attacks.
- Master of Elegance is optional in print. It uses the higher of the normal
  Strength damage and Dexterity, doubled when wielded two-handed, as Ataru does.
  It applies to Light melee weapons, not Unarmed Attacks. Inventory permits
  Two hands for supported melee weapons, including Light weapons, as printed
  in Melee Attacks18359. Ordinary Light-weapon Strength remains undoubled and
  existing Power Attack rules are unchanged. The grip remains selectable and
  clearable if the talent is lost.
- Hammerblow adds the Strength bonus once more to an Unarmed Attack when no weapon
  is held and the attack uses Strength. A carried, equipped weapon occupies
  the hands even if it is a deactivated Lightsaber. Only a positive bonus doubles.
  Auto attack ability compares the eligible Strength contribution (including
  Hammerblow) to replacement abilities. The selected raw modifier is unchanged
  and the extra Strength bonus is applied once. A manual Dexterity choice does
  not receive Hammerblow.
- Keen Shot and Blind Shot remove the attack penalty. Choosing a square against
  Total Concealment is still required.
- Knight Armor Mastery gives the Improved Armored Defense calculation while
  proficient, and satisfies either talent as a prerequisite.

## Manual

`unarmedModifiers.holdingItem` is an optional boolean declaration for a held
nonweapon item, exposed in the owner's folded Unarmed Modifiers. Missing means
false for older saves. It suppresses Hammerblow on every Unarmed row, including
natural and droid attacks. Worn gear is not assumed held. Tracked held weapons
also suppress it, independently of this declaration.

These stay Manual
because their weapons have no attack row: Weapon Specialization (Discblade) and
Bugbite (`manualAttack` equipment), and the Improvised Weapon talents.
