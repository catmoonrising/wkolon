# Encounter buff contract

This contract precedes calculations. Jedi Guardian Talent Tree supplies Battle
Meditation and Dark Side Talent Tree supplies Dark Presence (both Core
Rulebook, pinned sections). Bonuses and Penalties supplies typed stacking. Keep
the pinned articles verbatim.

Both reuse `talents[].activation` and saved `talentActivations` from the
[modifier contract](modifiers.md). The format now allows `action` Standard,
Swift or Full-Round, `forcePoints` 0 or 1, and optional `endsWhenUnconscious`.

Battle Meditation: one Full-Round Action and one Force Point grant the user a
+1 insight bonus on attack rolls until the end of the encounter. Its single
choice is `{target:'attacks', amount:1, type:'insight'}`. Insight bonuses use
the highest-of-type resolver, so a second insight source does not add. The
printed loss on unconsciousness names allies only; the user's own bonus lasts
for the encounter. Allies within 6 squares, range upkeep and starship Gunners
remain manual, so the talent is Partial.

Dark Presence: one Standard Action and no Force Point grant the user a +1 Force
bonus to all Defenses until the end of the encounter. Its single choice is
`{target:'defenses', amount:1, type:'force'}`. Force bonuses do not stack with
each other. "These bonuses are lost if you fall unconscious or die": a recorded knockout or
death removes the activation, including Bellow, Condition Track and manual HP
controls. Recovery removes any retained legacy activation before waking, and an
unconscious, 0 HP or dead character never receives it, whichever path set that
state. Allies and their range remain manual, so the talent is Partial.

Single-choice activations hide the benefit selector. A zero-cost activation
does not log a Force Point change. Existing encounter, combat and day resets,
ownership loss and atomic planning rules are unchanged.

Integration review: the shared knockout/death helpers accept the rules pack to
remove loss-on-unconsciousness activations at the transition. The app also
reconciles these activations before saving changes. Healing, natural rest and
consciousness checks clean legacy/imported unconscious states before recovery.
Invalid preflight still leaves the character unchanged. Battle Meditation is
not included in this loss rule under its printed ally-only wording.
