# Skirmisher contract

This contract precedes calculations. Misfortune Talent Tree revision 25729
supplies Skirmisher (Core Rulebook) and Improved Skirmisher (Scum and
Villainy). Keep the pinned articles verbatim.

`rules.moveTalentEffects` records each talent, its qualifying movement
(`minimumSquares: 2`, `minimumDisplacement: 1`), one closed effect and
`duration: 'start-next-turn'`. Skirmisher grants +1 on attack rolls and
Improved Skirmisher +1 to all Defenses, both unnamed.

A completed Move action qualifies when its route covers at least 2 squares and
its declared displacement (distance between starting and ending squares, the
existing Anointed Hunter field) is at least 1. Failed or unconfirmed movement,
Tumble failures and queued previews of other characters do not qualify. The
benefit applies after the move, as "you move ... before you attack". Charge,
Withdraw, Running Attack and other movement remain manual until their endpoints
are declared, as for Anointed Hunter.

Characters optionally save distinct `moveTalentEffects` IDs. Repeating a
qualifying move refreshes rather than stacks. New Turn, End combat, new
encounter, New day and rests clear them; End turn does not. Losing the talent
suppresses the benefit. Vehicle Weapon Systems remain manual. Both records are
Partial.
