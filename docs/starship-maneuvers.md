# Starship Maneuvers

The reviewed pack stores `starshipManeuvers` separately from Force powers.
Each record has an ID, name, pinned source, full article, automation marker,
action, printed `actionText` and descriptors. Actions use the existing action
names. Descriptors are `attack-pattern`, `dogfight`, `force` and `gunner`.
Intercept's maneuver section is distinct from its same-named Force power.

Starship Tactics grants a typed `starshipManeuverSlots` effect: one plus the
Wisdom modifier, minimum one. Each later permanent Wisdom modifier increase
adds one choice for every previously earned copy of the feat. Choices are
assigned to their acquisition level and replayed with class/feat eligibility.

Character `levels[].starshipManeuvers` entries contain a unique copy `id`,
`maneuverId` and boolean `spent`. Duplicate maneuvers have separate identities.
Unearned selections remain saved for editing but do not enter the active suite.
Older characters may omit the collection entirely.

The first implementation provides selection and manual spent-state tracking,
with exact rules available on the sheet and in creation. Vehicle-dependent
checks, action execution, target effects and recovery remain Manual until the
vehicle and role context is represented. Character Pilot alone is not a complete
vehicle Pilot modifier. Learning a Force maneuver does not assert eligibility
to activate it: the source requires trained Use the Force for activation.

The dedicated module follows the existing Force Powers manager and sheet layout.
Visibility does not affect selection capacity or retained spent states. Source
tables are imported reproducibly from pinned official articles, with the recursive
Homebrew exclusion list checked before adding any option.
