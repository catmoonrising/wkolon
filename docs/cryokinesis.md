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
it never moves the object farther down the CT. Retiering from the new check
uses the printed threshold table, an implementation reading rather than an
additional explicit sentence in the upkeep paragraph. Damage while maintaining
requires the shared concentration check, DC 15 plus damage taken. Preserve
end-next-turn timing rather than inheriting the start-next-turn timing of
resistance powers. An unrenewed effect stays active through the next own turn
and can be renewed later in that turn, even when omitted from the New Turn
maintenance choices. Each renewal spends its own Swift Action and makes its
own check. The source does not explicitly forbid repeating upkeep in one turn;
do not add that restriction. Renewals set the normal end-of-next-turn deadline
rather than accumulating another whole turn of duration per click.

Use the shared check, ordinary FP bonus, activation Adept/Mastery, power copy,
source access and action budget pipeline. Copy consumption and natural-20
suite recovery occur on activation only. Upkeep and concentration checks do
not consume another copy or trigger activation-only natural-20 recovery.
Mastery remains activation-only. Snapshot the
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
failed-check rescue, exact end-next-turn expiry, late-turn upkeep and repeated
Swift upkeep without stacked duration, activation-only copy/recovery, damage
concentration, source loss, legacy saves, independent instances, atomic previews,
full old-power state/results/RNG equivalence and actual controls/mobile/offline.
Require independent contract and runtime reviews, combined regression, CI,
Pages and exact deployed-version verification.

## Exact data and saved-state contract

The closed `rules.outgoingMaintainedPowers` record in mechanics/schema defines
only Cryokinesis for now. It pins every source constant above and keeps the
post-protection, pre-HP-halving damage amount already used by shared maintained
powers (Attacks 27406). Existing rule records and power articles stay unchanged.
Adding this record alone does not enable the action or advertise full automation.

The canonical target is exactly `{name, distance, lineOfSight, unattended,
mechanical, dr, condition}`. Name is trimmed, 1 to 100 characters, without
CR/LF/NUL. Distance is finite, from 0 to the rule's 12-square range. Both
lineOfSight and unattended must be true. Mechanical is a boolean meaning
mechanical or electronic. DR is null or an integer from 0 to 100000; condition
is null or an integer from 0 to 5. Omitted optional values become null, and
mechanical defaults false. Omitted confirmations remain false, never implicitly
satisfied. Raw declarations may omit defaults; saved canonical targets may not.
Both DR and CT are external declarations. Unknown CT never implies Normal.

Activation options use `outgoing` for the raw target and capture the closed
`outgoingPowerSnapshot: {powerId, target}` before RNG or costs. Capacity for a
new ongoing identity is preflighted before activation, even if it may fail.
Queued actions may edit raw declarations; completed/waiting results use the
snapshot exclusively. New snapshot or result namespaces on unrelated powers
are invalid. Old manual results without either namespace remain manual.

`outgoingPowerEffects` is optional, at most 1000 rows, with unique UUID IDs.
Each row is exactly `{id, powerId, target, maxTier, tier, enhanced,
endsRemaining, ended, maintained, pending}`. Power is Cryokinesis; target is
canonical. maxTier is 1 to 4 and tier is 1 to maxTier. Enhanced and maintained
are booleans. endsRemaining is 1 or 2 and ended is boolean; ended true requires
endsRemaining 1. Use the existing shared start/end-turn resolver. A row is
already applied to its external object, so its chosen tier is fixed. A new
upkeep check can earn a new maxTier and chosen tier after the shared lesser-tier
choice. The row ID is its activation step ID and is independent of whether its
original power copy is later spent, recovered or removed. Saved validity does
not require that copy; performing a new upkeep requires current source access.

Pending is null or exactly `{damage, check}`. Damage is an integer from 1 to
1000000000, and only a maintained row may have a pending concentration check.
Check is null or exactly `{natural, bonus, total}` with natural 1 to 20,
bonus/total integers from -100000 to 100000 and total = natural + bonus.
This concentration record never triggers activation-only recovery. No new
check may replace a saved concentration roll. A final FP bonus uses the shared
ledger; release remains possible after source loss. Resolve or release every
pending concentration before other actions, damage or time advancement.

Upkeep options use the existing `maintenancePowerSnapshot` namespace, extended
by a closed outgoing-family variant exactly `{family, effectId, powerId,
enhanced, turn, target}`. Family is outgoing; effectId is the original row UUID;
power, enhancement and canonical target must match that live instance while
waiting. Turn is the action's saved own-turn number. Old resistance snapshots
retain their existing exact shape. Every upkeep has its own action step UUID,
Swift cost and UTF check; it neither spends a power copy nor buys enhancement.
Ordinary FP and shared lesser-tier choice can remain pending before the final
upkeep result. Preview clones the state, reserves costs and never rolls.

Every finalized activation/upkeep stores a closed `outgoingPowerResolution`
exactly `{effectId, phase, status, total, tier, enhanced}`. Phase is activation
or upkeep. Status is applied, failed or released. Activation effectId equals
its step ID; upkeep effectId equals the original instance ID. Total equals the
saved final check. Applied tier is the earned/chosen 1 to 4; failed/released
tier is 0. A failed activation is never enhanced. An upkeep failure retains
its snapshot enhancement in the receipt. Released is upkeep-only, for an
instance released while its decision was pending. All such receipts belong
to done steps; waiting steps have none. Release closes the pending step,
disables FP/enhancement choices and removes any effect-choice waiting flag.
Historical receipts remain valid after the ongoing row disappears. Calculation
validation will recompute applied/failed tiers from the saved final check and
chosen DC; it will not reroll or require the expired/released target row.

The shared effect-choice helper must recognize outgoing activation and upkeep,
using the existing optional `effectDC` cap. Upkeep exposes no special-FP purchase.
Preserve old serialized results and old family dispatch when the new namespaces
are absent. New end-next-turn rows survive omission from New Turn's automatic
maintenance list. End-turn idempotence, skipped End turn, manual late upkeep,
repeated paid Swift checks and no accumulating expiry are mandatory. Coarse
elapsed waits of two or more full rounds expire an unrenewed short effect;
ordinary own-turn advancement uses the turn resolver once, not a second timer.
Explicit long rest/suite recovery clears these short effects, while natural-20
recovery does not. Removal/release never repairs or restores the external
object's one-time CT loss.
