# Rage powers and surprise rounds

This contract precedes calculation. Dark Rage revision 18081 supplies its Swift
activation, self target, DC 15/20/25 bonuses +2/+4/+6, Rage bonus type, melee-only
attack/damage and end-of-current-turn duration. An enhancement spends one Force
Point for encounter duration. It supplies no extra damage dice or Condition
Track cost. Failed activation spends the copy/action and retains the normal
Dark Side descriptor consequence without creating a bonus.

`rules.ragePowers` pins Dark Rage, Improved Dark Rage revision 19480, Wookiee
revision 27423 and Bonuses and Penalties revision 16336. The Wookiee article
identifies Mechanics, Stealth and Use the Force as examples requiring patience
and concentration. These known checks are unavailable during ordinary Dark Rage;
other context-dependent tasks remain subject to the printed restriction and GM
judgment. Do not infer a universal ban on every skill. Improved Dark Rage removes
the power's restriction, but does not remove an independent Wookiee Rage's
restriction. The technique must be a valid, active class choice when casting.

Optional `ragePowerEffects` rows snapshot
`{id, powerId, maxTier, tier, enhanced, focusAllowed}`. The action UUID identifies
the activation. Final after-check choices commit effect/resource spending once;
lesser tiers retain the achieved maximum. Improved Dark Rage's focus permission
is captured at activation. Repeated named Rage bonuses use the shared highest-of-
type resolver, including Wookiee Rage and any Rage damage contributions. Ranged
and special non-melee attacks get none of these bonuses. Natural melee attacks,
criticals and successive melee attacks use the same contribution. Native Rage
keeps its independent daily use, duration and persistent-condition consequence.
Dreadful Rage retains its reviewed native-trait improvement to +5; that
contribution also compares by type against the power rather than adding to it.

Ordinary Dark Rage expires at End turn, Charge's turn ending, or implicit turn
advancement. Enhanced Dark Rage lasts until the encounter ends. Repeated End
turn controls have no additional consequence. End combat, a new encounter,
minute/eight-hour rest and a new day clear power instances. Manual expiry refunds
neither Force Points nor suite copies and does not create a Condition step.

## Surprise rounds

`rules.surpriseRound` pins Combat Sequence revision 26725 and Improved Dark Rage.
An optional `actionState.phase` is normal, aware surprise, or surprised. Older
states without the field remain normal. Declare the phase before acting; changing
it never refunds resources. An aware combatant may spend a single Standard, Move
or Swift action. Full-Round actions and two/three-action combinations are not
available. Applicable Free/Reaction rules and limits remain independent.

A surprised combatant cannot act. The specific Improved Dark Rage exception
allows one Swift Dark Rage activation despite surprise. It does not grant other
actions, waive copies/checks/points or override helplessness. Phase selection
marks the character Flat-Footed; the first regular New Turn clears surprise and
that Flat-Footed declaration. Surprise and Flat-Footed are separate concepts;
Uncanny Dodge does not grant actions while surprised.

Combat Sequence also contains wording ending Flat-Footed as soon as a combatant
acts, conflicting with its explicit first-regular-turn paragraph. Use the latter
by default. An optional alternative has been asked about; do not silently switch
the default or invent an answer. Skills may also need context-specific patience
judgments. These declarations do not block implementing the sourced defaults.

## Pick a Fight

Brawler Talent Tree revision 16372 (Scum and Villainy): "During the Surprise
Round, you and all allies within 6 squares of you gain a +1 morale bonus on
attack rolls." The user's part is `{target:'attacks', amount:1, type:'morale',
when:'surpriseRound'}`, active while the saved round phase is a surprise phase
(Aware or Surprised) and gone once the first regular round begins. Allies and
the retained bonus against targets damaged during the Surprise Round remain
manual. The record is Partial.
