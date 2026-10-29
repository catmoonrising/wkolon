# Cryokinesis

Define the contract before calculations. Preserve Cryokinesis 20384 and Force
Powers 18202 verbatim, including pinned source metadata. This starts an outgoing
maintained-effect family, separate from personal resistance and shield effects.

Standard Action, one unattended object within 12 squares and Line of Sight.
The Use the Force thresholds are 20/25/30/35, reducing the object's DR by
5/10/15/20 until the end of the caster's next turn. A mechanical or electronic
object additionally moves one step down the Condition Track on activation.
The special FP increases the DR penalty by 5, without adding a CT step. An
object moved to the bottom ceases to function until repaired, otherwise unharmed.
No damage roll, defense comparison, creature targeting or size modifier is
introduced. No DR below zero or extra CT movement is inferred.

Maintenance is one Swift Action and a new Use the Force check each round.
It extends the normal duration and may determine a new earned effect tier;
it never moves the object farther down the CT. Damage while maintaining
requires the shared concentration check, DC 15 plus damage taken. Preserve
end-next-turn timing rather than inheriting the start-next-turn timing of
resistance powers. Maintenance may renew once per new own turn, never create
unlimited duration through repeated upkeep in the same turn.

Use the shared check, ordinary FP bonus, activation Adept/Mastery, power copy,
source access, action budget and natural-20 recovery pipeline. Snapshot the
object declarations and earned effect before resolving the result. Permit the
shared lower-tier choice, then lock a tier once used. Special enhancement and
ordinary FP bonus share the one-FP ledger. A provisional failed check can be
rescued before releasing an effect. Failed activation creates no ongoing row.
Failed finalized upkeep removes only that instance. Invalid declarations,
replays and missing sources fail before mutation or RNG. Old manual records
remain manual.

A closed rules.outgoingMaintainedPowers record identifies power, kind, exact
thresholds, initial CT step, special DR penalty, upkeep action/check, duration,
concentration DC and source IDs. Closed saved outgoingPowerEffects rows retain
an activation identity, power, canonical target, earned/chosen tier, enhancement,
shared turn-duration state and upkeep/use state. Define exact schema/validation
before adding the calculation, including bounded rows and activation snapshots.
Maintain identity independently of a spent/recovered copy. Reuse common duration,
maintenance, pending concentration and source checks through family dispatch;
do not duplicate the action/FP/time engines or change old serialized shapes.

Target declarations identify an unattended object, range/Line of Sight, and
whether it is mechanical or electronic. Any optional DR or CT values remain
external declarations. Output a DR penalty and the one-time CT consequence;
never mutate the caster's DR/CT, an inventory item or another character. Repair,
actual target stats, overlapping external effects and object identity remain
external, so Partial. Keep per-instance controls and details folded by default.

The original enhancement remains part of the same maintained power, with no
second enhancement purchase on each upkeep. Do not broaden the existing
Cloak-only Adept upkeep switch to new powers by accident. General Adept upkeep
scope remains an open ruling; activation Adept/Mastery and ordinary upkeep
checks can be implemented independently of that unresolved optional mode.

Before publication verify all thresholds and lesser tiers, mechanical/electronic
versus ordinary objects, one-time CT versus repeated upkeep, special/ordinary FP,
failed-check rescue, exact end-next-turn expiry, once-per-turn renewal, damage
concentration, source loss, legacy saves, independent instances, atomic previews,
full old-power state/results/RNG equivalence and actual controls/mobile/offline.
Require independent contract and runtime reviews, combined regression, CI,
Pages and exact deployed-version verification.
