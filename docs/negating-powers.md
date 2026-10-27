# Negate Energy and incoming attacks

This contract precedes calculation. Negate Energy revision 18380 permits a Reaction
against one Energy attack made against the acting character. Awareness and not
being flat-footed are required. A Use the Force result equal to or greater than
the attack's damage negates the attack. A lower result takes normal damage.
Successful negation permits spending one Force Point to regain that attack's
original damage as HP, capped at normal maximum HP. This special spending is a
Reaction; it is separate from the ordinary Free-action FP check bonus.

`rules.negatingPowers` is a closed reviewed record, with power ID, Reaction action,
Energy eligibility, awareness/flat-footed requirements, raw attack damage as the
check DC, inclusive comparison, and successful FP healing. Reference IDs pin
Negate Energy, Attacks, Force Powers and Hit Points. No pure-Energy restriction
is imported from equipment shields. A declared Energy component qualifies a mixed
attack; Sonic qualifies through its Energy equivalence. Fire alone does not.

Use the attack's declared damage before SR, DR, bonus HP or Stun/Ion HP-only
halving as both check DC and healing amount. On failure, apply that same snapshot
once through the existing incoming-damage engine, including shields, typed DR,
thresholds, special damage, knockout/death, declared survival FP and any Balance
or maintained Energy Resistance checks. On success, none of those damage costs
occur. The failed activation still consumes its selected suite copy and Reaction
trigger. Power Mastery and Adept retain their existing permissions and costs.

Store the incoming declaration in the queued action's options:
`incoming:{amount,options:{type,energy,sonic,fire,cold,electrical,lightsaber,
otherDamage,ignoreDR,spendForcePoint,requiresUseTheForce,against}}`.
Validate fields and current damage preconditions before rolling or mutating any
resources. Queueing only plans the reaction. Actual execution snapshots the
normalized declaration with its original Use the Force roll. Successful optional
healing uses the existing saved after-check decision. Reloading never rolls again;
ordinary FP check bonuses are unavailable on a Reaction. The optional healing and
Adept costs obey the ordinary one-FP-per-round ledger. The emergency survival
FP follows Hit Points23421's explicit exception, even after an earlier FP in the
round. Charge it only when failed negation actually causes an eligible death
and a point remains; successful negation never charges survival.

A pending negation decision blocks additional incoming damage and turn advancement.
It does not create an editable persistent DR/SR pool. Failure resolves immediately;
success can heal only after explicit FP acceptance. Keep means negate without
spending an FP. Special healing cannot reflect damage or heal another character.
Natural 20 recovery follows the original activation's owner-turn timing, not the
healing decision, and the decision itself is not a second activation.

HP offers Negate Energy beside Apply when an eligible unspent copy exists. Both
HP and Actions open the same pointer context form, with editable incoming damage,
Energy declarations, awareness and trigger. Typed damage controls remain compact.
The review marker stays Partial for contextual reroll prompts; attack damage and
awareness remain explicit user declarations rather than inferred enemy state.

Verification must cover equal DC success, failure protection ordering, mixed Energy,
Sonic, non-Energy rejection, Lightsabers, flat-footed/unaware guards, duplicate
triggers, no-cost queueing, atomic invalid declarations, Adept/ordinary FP limits,
saved healing decisions, full-HP cap, normal damage/threshold/survival and pending
checks, natural 20 timing, turn and encounter transitions, mobile layout, shared
HP controls and a real-offline hosted Firefox reload.

When baseline damage would require a declared survival FP, reserve it alongside
Adept's up-front FP before rolling. Reject an unfunded plan atomically, rather
than committing a saved choice that cannot finish. Optional after-check
enhancement can still be declined to keep that survival point available.
