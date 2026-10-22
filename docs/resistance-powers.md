# Resistance powers contract

This contract preceded runtime integration. Energy Resistance now resolves its self
activation, typed DR, early Swift payment and damage-checked maintenance through
the action and incoming-damage engines. Its Partial marker remains for contextual
reroll prompts and Improved Energy Resistance’s ally-target workflow.

Energy Resistance revision 19120 supplies Standard activation, self target,
DC 20/25/30/35 for DR 5/10/15/20, expiry at the start of the next turn,
one Force Point to activate as a Swift instead, Swift maintenance, and a
Use the Force check at DC 15 + damage taken when damaged while maintaining.
Attacks revision 27406 supplies strongest-applicable DR, SR before DR, mixed
damage types and Lightsaber bypass. Force Powers revision 18202 supplies
failed activation spending, lesser achieved effects and suite-copy accounting.

`rules.resistancePowers` is a closed reviewed record, separate from shield SR.
It records thresholds, duration, maintenance action, early quickening cost,
damage-check DC and source IDs. The quickening point is paid before the check,
including on failure. It uses the shared per-round FP limit and cannot be
offered as an after-roll enhancement. It grants no additional DR.

The table grants DR against Energy. The introduction separately names sonic,
fire, cold and electrical sources. Sonic Damage revision 26734 explicitly counts
as Energy in all ways; Fire revision 18174 supplies no such equivalence.
Keep the table's Energy reading as the default, and add an Ambiguities alternative
for all sources named in the introduction when the damage declarations are wired.
Do not silently classify every Fire attack as Energy for unrelated shields.
Mixed attacks with Energy qualify under Attacks' mixed-damage rule. Lightsabers
still bypass this DR; the power grants no exception. Its DR joins the strongest
applicable value, never adds to another source and never depletes like SR.

`resistancePowerEffects` rows snapshot
`{id,powerId,maxTier,tier,used,maintained,untilTurn,pending}`. The activation UUID
is the row ID. Lesser tiers can be chosen only before resolving incoming damage.
Initial activation sets `maintained:false`; the first paid renewal sets it true.
Renewal is due at the owner's next turn start and cannot be prepaid or repeated.
Several powers can be maintained if their actual action costs fit. Combine Shield
Standard maintenance and Resistance Swift maintenance through the shared atomic
New Turn preview and execution. No extra one-power limit is inferred.

Maintenance checks apply to damage from any source, including physical attacks,
only after the first renewal. The triggering hit receives its normal DR before
a failed maintenance check ends the power. Preserve damage after SR and DR,
before Stun/Ion HP-only halving and before bonus HP absorption, for this check's
DC. This uses the distinction between damage and HP subtraction in the pinned
Stun/Ion pages. Zero damage requires no check. Being unable to maintain releases
the effect rather than offering an unusable check.

Persist each required check as `pending:{damage,check:null}`. After rolling, store
`check:{natural,bonus,total}` before any optional FP decision. A reload must never
reroll. Maintenance checks are not power activations: no suite copy, descriptor
DSS or natural-20 suite recovery. Pending checks must be resolved or the effect
released before further damage, actions or turn advancement. A permitted FP
bonus uses the shared round limit. Resolve all affected maintained instances
independently; using only the strongest DR does not waive the others' checks.

New encounter, rest, New Day, death and unmaintained expiry clear effects and
pending checks without refunding copies or points. End combat alone does not
invent elapsed time. Improved Energy Resistance's ally targeting remains Manual
until target-owned state exists; it does not reduce action or point costs.

Integration must cover validation/derive, action dispatch and FP timing, family-aware
maintenance, atomic incoming damage, saved checks, Actions controls, read-only DR
graphics, stat blocks, expiry, offline caching and browser regression checks.


The shared maintained-powers dispatcher keeps Shield SR and Resistance DR in
separate saved families. New Turn carries only selected rows, then renews them
through their actual Standard/Swift action costs on an atomic clone. Several
Resistance copies can renew when their real costs fit; each takes its own damage
check. Actions displays the saved original roll and a separate FP/Keep decision.
HP renders typed DR as a read-only bar alongside unconditional protection. The
House Rules ambiguity retains both the table and introduction readings, with the
Energy table as default and Sonic treated as Energy under its pinned definition.
