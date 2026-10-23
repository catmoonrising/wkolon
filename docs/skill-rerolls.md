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
Skill substitutions carry original rerolls only under their reviewed explicit permission, as described below.

This batch automates sheet checks for thirteen talents: Acute Senses, Improved
Initiative, Improved Stealth, Barter, Jury-Rigger, Clear Mind, Dark Side Sense,
Master Slicer, both Notorious entries, Nowhere to Hide, Steady Under Pressure
and Difficult to Sense. Uses tied to unimplemented applications or vehicle
systems remain Partial. Other daily/encounter rerolls and enemy-forced rerolls require
additional reviewed resource and target handling.

## Daily rerolls

Knack extends the reviewed effect with `skill: "any"` and
`dailyUsesPerSelection: 1`. It keeps the better result and has no action or Force
Point cost. Each active selection adds one daily use. Optional saved
`recovery.knacksSpent` counts spending, defaults to zero for old files and resets
only on New day. Reloads, encounter changes and selection edits never refill it.

The Skills module offers Knack for any available rolled skill, including a
substituted skill check. Specific species/talent rerolls require their native check source or explicit
reviewed carryover permission. Each source still rerolls a particular check once;
extra Knack selections increase daily capacity rather than replaying one source
on the same check. Spending occurs only after a valid eligible reroll, even if
the original result is retained. A new check, intervening action, character
switch or reload invalidates old reroll opportunities. Source checks and daily
counts are refreshed before rolling, so stale controls cannot overspend.

Checks with already resolved automatic effects, including Force Power and
Force Focus execution, do not yet expose a Knack decision. Knack remains Partial
until those checks support the same before-resolution reroll decision.

Block/Deflect checks expose saved before-resolution choices for compatible rerolls,
including Soresu on failure and Knack. Each source can be used once on that check;
Knack also spends its shared daily capacity. Reloading preserves the original
modifier, attack DC, roll history and allowed source identities. A reroll is not
another Block/Deflect attempt. Other automatic checks retain their existing
partial status until they expose equivalent before-resolution controls.

## Reviewed substitution carryover

This contract precedes the carryover calculation. Seven existing pinned talent
articles explicitly permit the original skill's rerolls on a substituted check:
Force Intuition, Persuasion, Perception, Pilot, Deception, Treatment and Watchful
Step. Their `skillSubstitution` effect declares `carryRerolls: true`; missing
means false. Trace has no such grant. Validate the reviewed IDs and never infer
permission from all substitutions or from training grants.

The selected derived check source carries this permission and its application
scope. Native rerolls are unchanged. Carryover retains original source identity,
keep policy, upgrade, daily cost and one-use-per-check tracking. Conditional
rerolls retain their scopes. Force Perception limits inherited rerolls to Avoid
Surprise, Notice Targets, Sense Deception and Sense Influence; discard a source
whose application set does not overlap. Never transfer Sensors or scent-only
rerolls merely because Perception was substituted. Take 10 is separate.
