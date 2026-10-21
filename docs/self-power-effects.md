# Self-targeted Force power effects

`rules.selfPowerEffects` holds reviewed executable effects, separately from suite
copies and verbatim articles. The first record is Battle Strike: thresholds
15/20/25 grant one/two/three d6, a +1 Force attack bonus, an optional two-d6
enhancement, and expiry at the end of the next turn. Its damage is hit-only.
General Force Powers requires meeting the baseline DC; an enhancement does not
create an effect after a failed activation. A Force Point added to the check
may raise its tier; enhancement and check bonuses share the normal FP limit.

An optional saved `selfPowerEffects` array holds activation snapshots:
`{id, powerId, maxDice, baseDice, enhanced, endsRemaining, ended}`. The activation
ID is the action step ID. `maxDice` records the achieved tier; `baseDice` is a
chosen lesser effect, adjustable before the attack within the achieved tier.
Enhancement adds the reviewed two dice and does not increase the tier. No
ability-score change or suite recovery recalculates an existing snapshot.

Effects commit only after the original check's final FP decision. An immediate
check with no pending decision resolves once. Saved pending checks never reroll
or duplicate effects on reload. Failed activation still spends the action and
suite copy. Known self effects use the Actions path from suite controls too,
including when turn tracking was initially inactive.

Each active use targets the next attack roll: a miss consumes it, while invalid
attack preflight, queueing, or a preview does not spend real state. Every
eligible active use is consumed by the same next attack. Their +1 Force bonuses
use the shared highest-of-type resolver. Their undescribed damage dice stack
by default under Bonuses and Penalties; the alternative question is recorded in
the rulings register. Do not invent an unprinted same-power stacking prohibition.

Weapons, routines (only their first rolled attack), Charge, Running Attack,
opportunity attacks, Cleave and Bellow share this consumption. Use the Force
skill checks activating powers do not consume an attack-roll effect. A committed
weapon roll verifies the effect snapshot before spending any resources.

Conditional damage is recorded separately: an area's miss gets half its ordinary
damage and none of Battle Strike's hit-only dice. Evasion on a hit still halves
the full hit damage; cover and minimum-area-roll rules remain unchanged.
Non-area critical hits multiply all damage under Attacks; area attacks never
gain a critical multiplier. Full attacks preserve Aim/Brace/Mighty Swing expiry
and remove Battle Strike only after the first attack roll.

End-turn expiry shares the same duration helper as Anointed Hunter. Repeated End
turn clicks do not consume a second turn; New Turn implicitly ends an unended
turn. An own action that automatically restarts tracking reopens an already
ended turn clock, without counting another end; reactions do not do this.
Minute/eight-hour rests and new day expire it. Combat ending alone does not
invent elapsed time. The Actions module shows active uses and their lesser-tier
choices and manual expiry controls; removal never refunds spent resources.
Stat blocks and attack displays use the same state.
