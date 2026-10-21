# Shield powers and maintenance

This contract precedes calculation. Force Shield revision 19448 supplies its
Reaction, self target, DC 15/20/25/30 SR 5/10/15/20, optional FP +5, expiry at the
start of the next turn, Standard maintenance, and immediate end at SR 0. Its SR
cannot be recharged. Attacks revision 27406 supplies SR-before-DR and cumulative
five-point loss when attack damage exceeds SR. Force Powers revision 18202
supplies failed baseline spending, lesser effects, copies and natural-20 recovery.
No general one-maintained-power cap or damage concentration check is stated in
these articles. Do not import Energy Resistance's different maintenance rules.

`rules.shieldPowers` stores the closed reviewed record. Optional
`shieldPowerEffects` rows snapshot
`{id,powerId,maxTier,tier,enhanced,sr,used,untilTurn}`. The activation action UUID
is the ID. `untilTurn` is the owner's next action-state turn counter. A saved
power shield requires that counter. `sr` is positive and cannot exceed the
chosen rating. An unused effect has its full chosen SR. Lesser-tier correction
is permitted before any resolved incoming attack; afterward tier choices lock,
including when another stronger shield absorbed the attack. An upward tier edit
must never recharge damage already taken. Exhausted rows are removed immediately.

Shield protection selects the strongest applicable current rating across manual,
equipment and power sources. It never adds them. Keep each source's current SR
independent. Equipment Energy-only restrictions remain intact; Force Shield has
no such restriction. Selected source kind/ID/current rating are preflighted
before HP, bonus HP, CT, SR or Force Points change. Previewing damage spends
nothing. Committing damage locks all current power-shield choices and reduces
only the actual selected shield. Immunity spends none of those resources.

Power SR is a read-only graphic in HP and is also shown in Actions/stat blocks.
No Recharge or editable current-SR field may restore it. Removing a power never
refunds its suite copy or points. End combat alone does not invent elapsed time;
a new encounter, minute/eight-hour rest, new day, death or an unmaintained own
turn start expires it.

At New Turn, offer maintenance or release before changing real state. The preview
operates on a clone. Selected live shields retain their existing SR, enter the
new owner turn, and pay Standard actions through the shared action engine. Each
successful renewal advances only its expiry counter. Maintenance is available
only when that renewal is due, so a mid-turn click cannot prepay future rounds.
All selected renewals and turn advancement commit together or none do. The
printed cost/action capacity limits simultaneous maintenance; invent no extra
limit. Helpless characters cannot maintain. Force Shield itself states no new
skill check, damage check or additional point cost for maintenance.

A first tracked Reaction starts between own turns unless the player has already
started their turn. It must not silently grant an unspent own turn. Natural-20
suite recovery is tagged with the due owner turn when tracking exists. Repeated
End turn or the start of that future turn does not recover early; recovery occurs
at its end. Older undated pending recovery remains compatible with the manual
End turn control. Rest and actual recovery clear the pending turn marker.

Remaining context-dependent concentration restrictions and feature-specific
reroll prompts retain the Partial marker. No player declaration is interpreted
as permission to invent a maintenance check, recharge or resource refund.
