# Sneak Attack contract

This contract precedes calculations. Misfortune Talent Tree revision 25729
(Core Rulebook) supplies Sneak Attack; Attacks supplies critical hits and area
attacks. Keep the pinned article verbatim.

The attack target gains an optional declared flag, `dexDenied`, meaning the
opponent "is Flat-Footed or otherwise denied its Dexterity bonus to Reflex
Defense". The engine never infers it from the character's own state or from the
Helpless flag. The Target controls show it only for characters with a reviewed
talent that uses it, or while it is already set. The printed stat block omits it
with the rest of the selected opponent context.

Sneak Attack uses `{target:'sneakAttack', die:6, maximum:10, rangedSquares:6}`.
Each active selection adds one d6, to the printed maximum of 10d6. The dice
apply to a melee attack, or to a ranged attack whose declared distance is at
most 6 squares, against a `dexDenied` target. Ranged attacks without a declared
distance gain nothing. Per-target eligibility and damage on a miss for area attacks remain manual.
The current area roll therefore keeps its base expression; this is an automation
limit, not a printed prohibition on Sneak Attack with area weapons.

The dice join the damage expression after the weapon's damage and modifiers,
including Battle Strike's raw expression and the Aim, Bracing and Mighty Swing
variants, so critical hits multiply them like all other damage. The breakdown
names the extra dice. The record is Partial.
