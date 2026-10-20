# Bonus Hit Points

`rules.bonusHitPoints` pins the Hit Points article's Bonus Hit Points section
(Knights of the Old Republic Campaign Guide) and the Martial Arts Master class
article. Its `toughAsDurasteel` record identifies the class, minimum class level,
light/no armor restriction and prose/table ambiguity. This contract precedes the
calculations.

The optional saved `bonusHP` integer is a temporary pool, defaulting to zero.
A grant replaces it only when larger. It does not increase maximum HP, heal,
revive, or refill through ordinary healing. Incoming damage passes SR and DR,
then the damage type's HP-only reduction, then this pool, then ordinary HP.
Damage Threshold still compares penetrating damage before the HP-only reduction
and buffer. End combat, new encounter, New day and long rest clear the pool;
ordinary turn changes do not.

Tough as Durasteel starts at Martial Arts Master level 2. A qualifying unarmed
attack snapshots its class level and light/no armor eligibility. Rolling
conditional damage does not grant HP: the HP module offers a confirmation that
the attack actually damaged a target. A bulk roll offers one confirmation for
its qualifying attacks, not replayable grants after later incoming damage.
Stepwise routines allow resolving damage and its grant between attacks.

The optional `bonusHPTrigger: {classLevel}` stores the latest qualifying roll.
A new attack replaces it, and an intervening action or turn reset that clears
attack follow-ups clears it. Claiming deletes it without spending an action or
Force Point and without interrupting Cleave or a stepwise routine. Losing the
qualifying class suppresses the claim; a later class increase cannot enlarge the
snapshot. The default prose grants current class level; the alternative table
grants the last even class level. Existing unarmed profiles, including reviewed
natural and droid appendage unarmed attacks, share the trigger. Armed attacks,
natural 1 misses and zero damage cannot create one.

Manual pool edits support other sources whose targeting or activation is not yet
automated. Neither a manual pool nor this one class feature implies that all
bonus HP granting features are automated.
