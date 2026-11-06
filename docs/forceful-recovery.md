# Forceful Recovery

Pinned Galaxy of Intrigue feat, revision21183, SHA256
`f72a3726860b48274bbe8f4eceb9d4bdacfaa9e436d7d60b129a913be237f128`.
The source requires Force Sensitivity and Force Training. Whenever the character
catches a Second Wind, one expended power returns to their suite.

The reviewed feat gains the closed effect `{target:"forcefulRecovery"}` and
retains Partial status. Only valid acquired effects enable the benefit. The
shared Second Wind action gains optional saved `forcefulPowerId`, identifying
one active, spent suite copy by its existing UUID. If one copy is eligible, the
shared recovery planner may select it automatically; several eligible copies
require a choice. The normal action defaults to the first eligible copy and
lets the player choose another in the existing action panel. With no expended
powers, Second Wind proceeds normally without recovering a power. A supplied
unavailable, unspent, foreign, removed or inactive copy fails before HP, daily
uses, actions or FP change. Recovery costs no FP and does not re-activate or roll
the returned power. Identical powers retain their distinct copy identities.

The Second Wind healing resolver applies this recovery for both ordinary Second
Wind and Regenerative Healing. Regenerative Healing's later end-turn ticks do
not trigger additional recovery. Plan preview recovers only on its cloned state,
so later queued power activations can use the recovered copy; execution checks
current eligibility again. Actual HP buttons open the shared action panel when
there is a choice to make, even before turn tracking has started.

The original draft offered None despite the printed mandatory choice when an
expended power is available. This integration uses the printed effect and omits
that option in that situation. No new rule ambiguity or user ruling is inferred.
Only local character powers are affected. Existing Second Wind costs, healing,
Force Recovery dice, daily/encounter uses and regeneration durations are retained.
