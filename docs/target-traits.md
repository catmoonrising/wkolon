# Opponent trait contract

This contract precedes calculations. Sith Talent Tree revision 18499 (Dark
Scourge), Jedi Sentinel Talent Tree revision 26765 (Dark Side Scourge), Imperial
Inquisitor Talent Tree revision 19470 (Inquisition) and Bounty Hunter Talent
Tree revision 16359 (Jedi Hunter) are pinned and kept verbatim.

The attack target gains three optional declared flags: `jedi` ("characters
belonging to The Jedi"), `forceSensitive` ("characters who have the Force
Sensitivity feat") and `darkSide` ("a Dark Side Score of 1 or higher"). The
engine never infers them. Target controls show a flag only to characters with a
reviewed effect that uses it, or while it is set. The printed stat block omits
them with the rest of the selected opponent context.

Closed effects are currently calculated for non-area attacks against a matching
target. Resolving different traits among an area attack's targets, and their
individual hit/miss damage, remains manual:

- `targetAttack`: typed or unnamed attack bonus, resolved against the attack's
  existing modifiers with the shared highest-of-type rule. Dark Scourge: +1
  Dark Side bonus against Jedi. Inquisition: +1 against Force Sensitivity.
- `targetDamage`: Dark Side Scourge adds the Charisma modifier (minimum +1) to
  melee damage against Dark Side Score 1+.
- `targetDice`: one extra weapon damage die. Inquisition and Jedi Hunter each
  add one against Force Sensitivity. Undescribed extra dice stack by default,
  as for Battle Strike under Bonuses and Penalties.

Extra dice and flat damage join every damage expression, so critical hits
multiply them. Breakdowns name each source. Records stay Partial. Master of the
Great Hunt is excluded until its "on Lightsaber attacks" scope is resolved.

## Position flags

Three more declared flags describe the attacker's position relative to the
selected opponent: `noCover` ("you do not have Cover from a target"),
`adjacent` ("occupy the same square as your target or are adjacent to your
target") and `concealed` ("you have Concealment against a target"). They are
distinct from the target's own Cover and Concealment, which still apply.

- Face the Foe (Gambling Leader Talent Tree revision 20650): +1 morale attack
  against a `noCover` target.
- Close-Quarters Fighter (Melee Specialist Talent Tree revision 19986): +1
  circumstance melee attack against an `adjacent` target.
- Sentinel's Observation (Jedi Sentinel Talent Tree revision 26765): +2
  circumstance attack against a `concealed` target.

The two circumstance bonuses use distinct circumstance keys, so they add. All
three records are Partial.

## Master of the Great Hunt

Jedi Sentinel Talent Tree revision 26765 (Jedi Academy Training Manual): "You
gain a +1 Force bonus on attack rolls and deal +1 die of damage on Lightsaber
attacks made against a Beast with a Dark Side Score of 1+." A declared
`beastDarkSide` flag ("Beast, Dark Side Score 1+") identifies the target.

The Lightsaber scope of the attack bonus is ambiguous. Per the user's
instruction to offer alternatives for recorded ambiguities,
`ambiguity:great-hunt-scope` defaults to `lightsaber-only` (both benefits only
on Lightsaber attacks, reading "on Lightsaber attacks" as governing the whole
sentence). The alternative `attack-any` grants the +1 Force attack bonus on any
attack against such a Beast while keeping the extra die Lightsaber-only. Effects
use `weaponGroup: 'lightsabers'`; the attack effect names the switch through
`scopeAmbiguityId`. The record is Partial.

## Cantina Brawler

Brawler Talent Tree revision 16372 (Scum and Villainy): "While Flanked, you
gain a +2 bonus on Unarmed attack rolls and damage rolls." A declared
`flankedSelf` flag ("You are Flanked") describes the attacker. Effects use the
same resolver with `unarmed: true`: an unnamed +2 attack and a fixed +2
`targetDamage` (`amount`, no ability). They apply only to unarmed attacks and
to non-area attacks. The record is Partial.

These declared target bonuses currently resolve weapon attacks with a known
single target and known damage. Area attacks and nonweapon attacks remain
manual, including under Great Hunt's broader attack-bonus interpretation. The
weapon-group comparison uses the shared Counseling-aware identity, preserving
folded-stock proficiency and range semantics. Temporary target declarations
remain excluded from the ordinary stat block. No target type is inferred.

## Retribution

Opportunist Talent Tree revision 20013 (Clone Wars Campaign Guide): "When a
target moves one of your allies in your Line of Sight down the Condition Track
by any means, you gain a +2 insight bonus to your attack rolls against that
target until the end of your next turn." A declared `harmedAlly` flag ("Moved an
ally down the Condition Track") marks that opponent; `{target:'targetAttack',
against:'harmedAlly', amount:2, type:'insight'}` applies through the shared
resolver. The flag is the declaration, so clearing it when the duration ends is
manual. The record is Partial.

## Starship Raider

This section precedes calculations. Spacer Talent Tree revision 18516 (Starship
Raider, Core Rulebook): "You gain a +1 bonus on attack rolls made while aboard a
Starship. This bonus applies to attacks made with Starship Weapons, as well as
personal weapons used aboard a Starship." A declared attacker-state flag,
`aboardStarship` ("You are aboard a Starship"), activates `{target:'attacks',
amount:1, type:'untyped', when:'aboardStarship'}` for every personal attack,
including area attacks. Starship Weapons are not personal attack rows yet, so
that clause stays manual. The flag appears only to owners or while set. The
record is Partial.
