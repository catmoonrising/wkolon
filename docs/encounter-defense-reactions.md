# Encounter Defense reactions

Contract for once-per-encounter Reactions that add to one Defense. Sources are
each record's pinned article, Bonuses and Penalties, and Combat Sequence.

## Data

`rules.encounterDefenseReactions` rows: `{id,recordId,defenses,amount|ability,
type,duration,sourceIds}`. Each `id` is a Reaction in `actionEconomy`.

| Record | Defense | Amount | Type | Lasts until |
| --- | --- | --- | --- | --- |
| Brilliant Defense | Reflex | INT modifier | untyped | start of next turn |
| Indomitable Personality | Will | CHA modifier | untyped | end of next turn |
| Logic Upgrade: Self Defense | choice | +2 | morale | end of next turn |
| Better Lucky than Dead | choice | +5 | luck | start of next turn |

## Saves

`defenseReactions: [{id,defense,until,endsRemaining,ended}]` holds active rows and
`defenseReactionsUsed: [id]` holds this encounter's uses. Both are optional and
validated with `reactionTalents`, sharing its turn hooks and encounter clearing.

End of next turn uses the snapshot in docs/matukai-defenses.md. A row lasting
until the start of the next turn is removed by New Turn and survives the end of
the current turn.

## Resolution

The bonus joins `defenseBonus` rows, so morale and luck follow typed stacking.
Ability amounts read the current modifier, as other modifier-based Defense
rows do. A use is spent on activation and does not return until the encounter
clears, including if the benefit has ended. Losing the record suppresses the
benefit.

## Manual

The trigger is the player's choice of when to react. Preternatural Senses prints
no duration and is not included.
