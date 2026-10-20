# Skill reroll sources

Reviewed talent effects use `{target: "skillReroll", skill, keep, when}`.
`keep` is `new` or `best`; `when` names a reviewed skill application, or `always`.
Acute Senses has two entries: ordinary Perception and Use Computer with Sensors.
Conditional controls identify the application and any required declaration,
such as being undisguised. Their full rules remain in the talent's article.

Species traits and active talent effects supply independent reroll sources.
The sheet's check tracker snapshots the eligible sources, skill modifier and
selected check source when rolling. Each source may reroll that check once;
acquiring a talent later cannot authorize a reroll of the earlier check. A new
check or character-state change invalidates the old opportunity. Reloading does
not recreate an unrecorded roll opportunity from history.

Rerolls resolve in the chosen order, before applying check effects. A `new`
source replaces the currently kept roll even when worse. A `best` source keeps
the better of the current roll and the new roll, rather than the best of every
historical roll. Applying a source consumes that source, retaining other legal
sources for the same check. Species reroll-upgrade feats affect their species
source, not unrelated talents.

Conditional sources must have a compatible application. For example, Haggle
and Intimidate cannot describe the same Persuasion check. Opposing Sense Force
is distinct from making Sense Force checks; the broader Kel Dor application can
combine with sensing Dark Side users, but not concealing one's presence.
Skill substitutions do not inherit the original skill's reroll traits.

This batch automates sheet checks for thirteen talents: Acute Senses, Improved
Initiative, Improved Stealth, Barter, Jury-Rigger, Clear Mind, Dark Side Sense,
Master Slicer, both Notorious entries, Nowhere to Hide, Steady Under Pressure
and Difficult to Sense. Uses tied to unimplemented applications or vehicle
systems remain Partial. Daily/encounter rerolls and enemy-forced rerolls require
additional reviewed resource and target handling.
