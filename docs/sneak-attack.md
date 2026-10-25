# Sneak Attack contract

This contract precedes calculations. Misfortune Talent Tree revision 25729
(Core Rulebook) supplies Sneak Attack; Attacks supplies critical hits and area
attacks. Keep the pinned article verbatim.

The attack target gains an optional declared flag, `dexDenied`, meaning the
opponent "is Flat-Footed or otherwise denied its Dexterity bonus to Reflex
Defense". The engine never infers it from the character's own state or from the
Helpless flag. The Target controls show it only for characters with a reviewed
talent that uses it, or while it is already set. The printed stat block omits it
with the rest of the selected opponent context.

Sneak Attack uses `{target:'sneakAttack', die:6, maximum:10, rangedSquares:6}`.
Each active selection adds one d6, to the printed maximum of 10d6. The dice
apply to a melee attack, or to a ranged attack whose declared distance is at
most 6 squares, against a `dexDenied` target. Ranged attacks without a declared
distance gain nothing. Per-target eligibility and damage on a miss for area attacks remain manual.
The current area roll therefore keeps its base expression; this is an automation
limit, not a printed prohibition on Sneak Attack with area weapons.

The dice join the damage expression after the weapon's damage and modifiers,
including Battle Strike's raw expression and the Aim, Bracing and Mighty Swing
variants, so critical hits multiply them like all other damage. The breakdown
names the extra dice. The record is Partial.

## Flanking

Assassin Talent Tree revision 15944 (Advantageous Positioning): "Any opponent
that you are Flanking is considered Flat-Footed and is denied its Dexterity
bonus to its Reflex Defense against you." A declared `flanking` target flag
("You flank") counts as `dexDenied` for the owner's own attacks through
`{target:'flankingDeniesDexterity'}`. Flanking itself, and effects on other
characters' attacks, remain declarations. The general +2 flanking attack modifier
is still manual; this effect automates the owner's denied-Dexterity damage
interaction. The record is Partial.

## Sentinel Strike

This section precedes calculations. Jedi Sentinel Talent Tree revision 26765
(Knights of the Old Republic Campaign Guide): "Any time you attack a Flat-Footed
opponent (or one who is denied its Dexterity bonus to its Reflex Defense against
you) with a damage-dealing Force Power, or attack with a Lightsaber, you deal an
extra +1d6 points of damage with that attack. This Talent does not affect Force
Powers with the [Dark Side] descriptor. You can select this Talent multiple
times. Each time you select it, your Sentinel Strike damage increases by +1d6
points (maximum +5d6 points of damage)."

`{target:'sentinelStrike', die:6, maximum:5, weaponGroup:'lightsabers'}` adds
1d6 per active selection, to the printed 5d6, on non-area Lightsaber attacks
(shared `weaponIdentityGroup`) against an opponent who counts as denied
Dexterity under the Sneak Attack rules above (declared Denied Dexterity, or a
flanked opponent with Advantageous Positioning). The dice stack with Sneak
Attack and join every damage expression, so critical hits multiply them.

The sentence's scope is ambiguous: the denied-Dexterity condition may govern
both clauses or only the Force Power clause. Per the user's instruction to
offer alternatives for recorded ambiguities, `ambiguity:sentinel-strike-scope`
defaults to `denied-dexterity` and offers `any-lightsaber`, which applies the
dice to every Lightsaber attack. The damage-dealing Force Power clause (and its
[Dark Side] exclusion) stays manual because Force Power damage has no rolled
target expression yet. The record is Partial.

## Declared Flat-Footed opponents

This section precedes calculations. Brute Squad Talent Tree revision 16400
(Squad Superiority, Legacy Era Campaign Guide): "Whenever you and at least two
allies are adjacent to the same target, that target is considered Flat-Footed
against you." Run and Gun Talent Tree revision 19313 (No Escape, Knights of the
Old Republic Campaign Guide): "Whenever an opponent uses the Withdraw Action to
leave your Threatened Area, that opponent is considered Flat-Footed against you
until the end of your next turn."

A Flat-Footed opponent is denied its Dexterity bonus, so both feed the same
denied-Dexterity check used by Sneak Attack and Sentinel Strike through
`{target:'deniedDexterityWhen', against}` with declared flags `squadAdjacent`
("You and two allies adjacent") and `withdrewFromYou` ("Withdrew from your
threatened area"). The flags are shown only when the character owns the talent
and a denied-Dexterity consumer, because the opponent's own Reflex Defense is
not on this sheet. No Escape's duration is a declaration: clear the flag when it
ends. Both records are Partial.
