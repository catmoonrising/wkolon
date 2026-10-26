# Force items and Battle Meditation

This contract precedes integration calculations. Force Item Talent Tree
revision 18215 (Core Rulebook) supplies Force Talisman, Greater Force Talisman,
Attune Weapon and Empower Weapon. Jedi Battlemaster Talent Tree revision 19187
(Knights of the Old Republic Campaign Guide) supplies Jedi Battle Commander.
Pinned articles and prerequisites remain unchanged.

A saved inventory `talisman` designation is Reflex, Fortitude, Will, or `all`.
Only one ordinary designation and one Greater designation are permitted. A
carried item and the corresponding active talent add +1 Force to the chosen
Defense, or to all three for Greater. Ordinary and Greater do not stack with
each other or with other Force bonuses. Conditional Defense totals and Damage
Threshold continue through the shared Defense resolver. Designations persist
when dropped or when their talent is lost, but supply no bonus in those states.

Saved booleans `attuned` and `empowered` are permitted only on melee weapons.
The corresponding active talent is always required. Attune Weapon adds +1 Force
attack through typed stacking for that inventory entry. Empower Weapon adds one
die of the weapon's current damage die through the shared extra-dice resolver,
before critical multiplication. Other entries, Unarmed Attacks and ranged
attacks do not inherit that designation. Thrown use needs its separate rules.

These item controls declare an already created personal Force item. Creation's
Force Point, Full-Round Action, destruction and the Talisman 24-hour recreation
restriction remain manual; checking a declaration does not spend a Force Point.
They are not transfers of someone else's personal item powers. All records stay
Partial, and inventory state alone never grants a missing talent.

Jedi Battle Commander replaces the existing personal Battle Meditation attack
bonus with +2 insight. It keeps Battle Meditation's Full-Round activation,
Force Point cost, encounter duration and unconsciousness interpretation. Insight
does not stack with other insight bonuses. Losing the Commander talent returns
an otherwise valid active meditation to +1. Other actors' shares remain manual.
Actual Jedi Knight entry and the printed Battle Meditation prerequisite must
remain enforced; no test may move a talent to bypass class access.
