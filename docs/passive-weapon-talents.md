# Passive weapon talents

Contract for always-on weapon and armor effects. Sources are each record's pinned
article.

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

- `exotic-weapons` matches any weapon whose printed group is exotic. `unarmed`
  matches Unarmed Attacks.
- Master of Elegance is optional in print. It uses the higher of the normal
  Strength damage and Dexterity, doubled when wielded two-handed, as Ataru does.
  It applies to Light melee weapons, not Unarmed Attacks.
- Hammerblow adds the Strength bonus once more to an Unarmed Attack when no weapon
  is wielded and the attack uses Strength. Only a positive bonus doubles.
- Keen Shot and Blind Shot remove the attack penalty. Choosing a square against
  Total Concealment is still required.
- Knight Armor Mastery gives the Improved Armored Defense calculation while
  proficient, and satisfies either talent as a prerequisite.

## Manual

Holding a non-weapon item in hand is not tracked for Hammerblow. These stay Manual
because their weapons have no attack row: Weapon Specialization (Discblade) and
Bugbite (`manualAttack` equipment), and the Improvised Weapon talents.
