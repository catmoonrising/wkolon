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

The saved `ion-electronic-damage` ambiguity keeps Ion Damage's HP divisor of 2
by default. Its alternative uses Ion Pistol/Ion Rifle's full damage against
droids and cybernetically enhanced characters. The same resolved droid or saved
Cybernetic declaration used for ion track effects determines that eligibility.
SR/DR precede this choice, and the bonus HP buffer follows it. Damage Threshold
always uses the pre-division penetrating damage. The separate stun/ion death
interpretation remains independent. Ordinary biological targets still take half
ion HP damage under either option; stun and normal damage do not change.

## Declared Bonus Hit Point grants

`rules.bonusHPGrants` records talents whose Bonus Hit Points follow an external
event the sheet cannot observe. Each row has `talentId`, `trigger`, `base`, the
`level` used (`character` or `heroic`), a `levelDivisor` (rounding down) and
exact `sourceIds`. The HP module shows one button per owned grant; pressing it
declares the event and grants through the same replace-only-when-larger pool,
so grants never stack. Dead characters cannot claim. The pool's existing
encounter, combat, day and rest resets apply.

- Thrive on Chaos (Opportunist Talent Tree revision 20013): an enemy or ally
  within 20 squares is reduced to 0 HP; 5 + one-half Character Level.
- Shoulder to Shoulder (Republic Commando Talent Tree revision 20035): you begin
  your turn adjacent to an ally; Heroic Level.
- Bando Gora Surge (Bando Gora Captain Talent Tree revision 16124): you move up
  the Condition Track; 5 + Heroic Level.

The current pack has no nonheroic classes, so Heroic Level equals Character
Level. All three triggers remain declarations; the records are Partial.

Luck Favors the Bold (Gambling Leader Talent Tree revision 20650): at the start
of your turn, if you lack Cover against an aware enemy in your Line of Sight and
you are conscious, 5 + one-half Heroic Level. Its row sets `conscious: true`,
so a character at 0 HP or at the bottom of the Condition Track cannot claim it.
