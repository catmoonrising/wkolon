# Timed talent activations

`rules.timedTalentActions` binds a dispatcher ID to `talentId`, `forcePoints`,
`durationRounds`, `damageReduction` and exact pinned `sourceIds`. Damage
Reduction 10 costs a Standard Action and one Force Point, and lasts one minute.
Combat Sequence revision 26725 defines a round as six seconds and expires
round-based effects just before the initiative count on which they began.
One minute therefore spans ten rounds. Attacks defines DR as the strongest
applicable source and states that Lightsabers normally bypass it.

Characters optionally save distinct `timedTalents: [{id, rounds}]`. Activation
sets the reviewed duration. Repeating it refreshes the duration, spends the
same resources and does not stack DR. Losing the talent suppresses its benefit.
Standard actions and Force Points use the existing transactional dispatcher,
including the one-FP-per-round restriction. Plans and previews change only copies.

A tracked New Turn advances one round when a tracked turn was already active;
Start turn does not invent elapsed time. The legacy Next turn control advances
one round too. DR applies through the activation round and expires before the
tenth following turn. End turn, End combat and new encounter do not invent
elapsed time. A one-minute Force power rest advances ten rounds. New day and
eight-hour rest clear this short effect. The Actions module exposes remaining
rounds for manual adjustment when time passes outside tracked turns or
initiative changes. It uses game time, never the computer's wall clock.

The effect joins manual, species and class DR in the existing protection
resolver. It never adds them together or lowers the stored manual value.
Lightsaber bypass and explicit armor exceptions remain in that same resolver.
The HP bar, incoming damage and stat block use the resolved protection.
