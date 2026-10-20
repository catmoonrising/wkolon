# Reviewed skill actions

`rules.skillActions` binds an Actions dispatcher ID to a `talentId`, `skillId`,
fixed `dc`, supported `effect`, and pinned `sourceIds`. Action time comes from
that ID in `rules.actionEconomy.actions`; it is not independently inferred from
prose. This first format supports Force Focus, a Full-Round Use the Force DC 15
check that recovers one selected spent Force Power copy. It has no Force Point
cost and no daily or encounter limit.

The common planner validates active talent ownership, skill availability,
selected copy and action budget. Rolling stores the check once. Taking 10
requires training and an explicit declaration of no threats or distractions;
Use the Force forbids Taking 20. The general GM exception for routine untrained
Taking 10 remains manual. Skill checks do not automatically fail on a natural 1
or succeed on a natural 20.

A Force Point bonus can be chosen after a roll or a Take 10 check, before resolving the
check's effect. The existing one-per-round and own-turn restrictions still
apply. A pending choice saves the original natural roll, modifier and total,
blocks further tracked execution and survives reload. Keeping the result or
adding a Force Point resolves the effect exactly once. A changed or unavailable
target/talent never recovers a different power automatically or grants a refund.

Force Focus is a skill check, not activation of the recovered power. Recovering
a Dark Side power neither increases DSS nor prohibits a Force Point bonus to
the check. Rolling 20 does not recover the whole suite. Duplicate copies remain
independent. Invalid execution mutates no real resources or roll history, and
planning never rolls dice or spends resources.
