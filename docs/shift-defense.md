# Shift Defense contract

This contract precedes calculations. Military Tactics Talent Tree (Core
Rulebook, pinned sections) supplies Shift Defense I, II and III. Bonuses and
Penalties supplies stacking. Keep the pinned articles verbatim.

`rules.defenseShiftActions` binds a dispatcher ID to `talentId`, `bonus`,
`penalty`, `type`, `duration` and exact `sourceIds`. Shift Defense I trades a
-2 penalty on one Defense for a +1 competence bonus to another; Shift Defense II
trades -5 for +2. Each costs one Swift Action and lasts until the start of the
next turn, using the same reset points as turn talents (New Turn, new
encounter, New day, rests and End combat).

Characters optionally save distinct `defenseShifts: [{id, bonus, penalty}]`
with two different Defenses. Separate uses may coexist. Competence bonuses use
the highest-of-type resolver; penalties always add. A use identical to an
active one is rejected. Damage Threshold follows the resulting Fortitude
Defense. Losing the talent suppresses its rows. Helpless or incapacitated
characters cannot activate it; previews and failed preflight change nothing.

## Shift Defense III (user ruling, 2026-10-23)

Shift Defense III: "As a Swift Action, you can gain a +5 competence bonus to one
Defense (Reflex, Fortitude, or Will) by taking a -5 penalty to your other two
Defenses." It prints no duration. User ruling: it lasts until the start of your
next turn by default; Ambiguities offers the literal reading, no automatic
expiry (`ambiguity:shift-defense-iii-duration`, values `start-next-turn` and
`permanent`).

The record uses `penaltyScope: 'others'`: one chosen Defense gains +5
competence and each other Defense takes -5. Its saved row stores `penalty:
null`. Activation snapshots the setting: under `permanent` the row is saved
with `persistent: true` and survives New Turn, End combat, new encounter, New
day and rests; the Actions module lists it with a remove control, and removing
it refunds nothing. Changing the setting does not rewrite existing rows. The
talent is Partial.
