# Melee damage dice

This contract precedes calculations. Primitive Warrior revision 20734
(Rebellion Era Campaign Guide) and Master of Teräs Käsi Talent Tree revision
26645 (Threats of the Galaxy) remain pinned and unchanged.

Primitive Warrior adds one damage die to Simple Weapons (Melee). The existing
Counseling-aware weapon identity determines the group; Unarmed Attacks are
Simple Weapons, and weapons treated as Simple through Weapon Familiarity use
the existing counseling switch. Ranged and thrown attacks do not qualify.
The feat still requires Gamorrean and is never granted by a declared flag.

Teräs Käsi Basics adds one die to Unarmed Attacks only. The die is the attack's
current die after Martial Arts and size resolution. The talent's printed
Martial Arts I prerequisite and Elite Trooper or Martial Arts Master access
remain unchanged. Tests must use actual class entry and legal choices rather
than moving the talent to an easier tree.

Closed effects are `groupDice` with weaponGroup `simple-weapons`, mode `melee`
and dice 1, and `unarmedDice` with dice 1. Both join the shared extra damage dice
resolver before damage expressions and critical multiplication. They add when
both apply. They do not grant proficiency, attack bonuses, Strength bonuses or
extra applications to unrelated weapons. Losing an eligible selection removes
its dice immediately. Both stay Partial under the catalog's current convention.
