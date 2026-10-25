# Weapon mode talent contract

This contract precedes calculations. Privateer Talent Tree revision 19543 (Ion
Mastery, Force Unleashed Campaign Guide) and Pistoleer Talent Tree revision
19729 (Twin Shot, Scum and Villainy) are pinned and kept verbatim.

Ion Mastery: "When attacking with Ion weapons, you gain a +1 bonus on attack
rolls and deal +1 die of Ion damage." An Ion weapon is one whose printed damage
type names Ion (Ion Pistol, Ion Carbine, Ion Rifle, Ion Grenade, EMP Grenade).
`{target:'ionAttack', amount:1, type:'untyped'}` joins the attack's typed
modifiers; `{target:'ionDice', dice:1}` adds one die of the weapon's own die
before Rapid Shot, Burst Fire, Deadeye or Mighty Swing dice, which stack with it
by the undescribed-dice default. Critical hits multiply it.

Twin Shot: "When you are wielding two Pistols, you gain a +2 bonus to damage
rolls when using the Rapid Shot feat." `{target:'twinShotDamage', amount:2}`
adds +2 unnamed damage to a Pistol attack whose selected technique is Rapid Shot
while at least two distinct equipped, carried Pistol entries are wielded
(quantities do not create extra wielded weapons). Prerequisite replay is
unchanged. Both records are Partial.

## Nonlethal Tactics

Enforcement Talent Tree revision 26769 (Force Unleashed Campaign Guide): "When
you are using a ranged weapon set to Stun, Stun Grenades, Nets, or Stun Batons,
you gain a +1 bonus on your attack roll and deal +1 die of Stun Damage."
`{target:'stunAttack', amount:1, type:'untyped', weapons:[Stun Grenade, Net,
Electronet, Stun Baton]}` applies to a ranged weapon whose resolved damage effect
is Stun and to those exact items. `{target:'stunDice', dice:1}` adds one die of
the weapon's own dice when a ranged attack's damage is Stun (Stun setting, Stun
Grenade). Nets deal no damage. The Stun Baton's existing Stun setting resolves
to 2d6 Energy (Stun); while that setting is selected, the same `stunDice` adds
one die (3d6). The die applies to melee only for the listed Stun Baton, never to
its normal Bludgeoning 1d6 setting, and no mixed normal/Stun damage is created.
The record is Partial.

The integration retains Partial status. Unknown/manual attacks stay manual. The Pistol identity check
uses the shared Counseling-aware weapon identity, so a folded Rifle does not
become a Pistol for Twin Shot. Daily/turn effects and source prerequisites retain
their existing resolvers. Resolved Ion and ranged Stun bonus dice become part of
the weapon damage before independent or explicitly nonstacking technique dice.
