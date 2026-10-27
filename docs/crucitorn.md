# Crucitorn

Define this contract before calculations. Preserve Crucitorn revision 20383,
Force Powers 18202, Attacks 27406 and Bonuses and Penalties 16336. Reuse the
incoming damage declaration, typed modifier, action, suite-copy, FP and
after-check choice machinery. This is a Reaction to an attack or Force Power
against the user, not a persistent or editable Damage Threshold pool.

DC 15/20/25/30 grants a +5/+10/+15/+20 Force bonus to Damage Threshold against
that attack or power's damage. One optional FP increases the bonus by 5.
Below DC 15, the power grants no bonus, but the original incoming damage
still resolves. Permit lesser achieved tiers before or after the check.
The bonus applies only to the triggering damage resolution. It does not
raise Fortitude or any later attack's Damage Threshold.

Use shared typed bonus resolution for contributions to Damage Threshold.
Existing threshold-specific Force bonuses compete with Crucitorn, while
bonuses contributing to Fortitude are already part of the underlying Defense.
Preserve the selected Fortitude/Will threshold basis, contextual defenses,
size, Improved Damage Threshold, manual modifiers and penalties. Do not
replace the user's normal derived threshold or mutate those modifiers.

Snapshot and validate the original incoming declaration and check. Apply
the event's damage once, after the final tier/FP choice, through the shared
SR/DR, bonus HP, normal/Stun/Ion, threshold, knockout/death and survival rules.
Preserve subsequent Balance and maintained Energy Resistance checks. Do
not negate damage, heal HP, bypass protection or duplicate a damage event.

The printed power has no Energy-only, awareness or flat-footed restriction;
do not copy those extra guards from Negate Energy. Retain common activation
and Reaction-trigger eligibility. Ordinary Free-action FP check bonuses are
unavailable on a Reaction under the existing shared action rules. Adept and
the printed enhancement obey the one-FP ledger, including a declared survival
FP. Reject incompatible FP plans before rolling or spending; do not silently
discard a requested survival choice. Mastery and natural-20 suite recovery
retain their existing permissions and turn timing.

Queue and preview cost nothing. A pending decision blocks another incoming
damage application and turn advancement. Save/reload cannot reroll a check,
spend again or reapply completed damage. Invalid declarations/results fail
atomically. Older saved manual Crucitorn checks retain manual behavior,
without inventing a retroactive incoming attack or bonus.

HP and Actions use the same pointer context form and normalized declaration.
Keep labels concise, allow the appropriate damage declarations, and show the
threshold used plus the resolved HP/Condition result. Share tier validation
and choices with offensive powers without relaxing their saved snapshot
guards or changing their damage calculations. Cache new modules/contracts
for offline use. Keep the catalog Partial for declared external attacks and
verify complete legal fixtures, stacking/context edges, actual controls,
resources, saves, mobile and refused-network Firefox before release.
