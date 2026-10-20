# Condition recovery talents

`rules.conditionRecoveryActions` declares a dispatcher `id`, `talentId`, positive
`steps`, `forcePoints`, `removePersistent`, `dailyUsesPerSelection` and pinned
`sourceIds`. Action time comes from `rules.actionEconomy.actions`. This reviewed
format currently supports Equilibrium and Indomitable, both Swift Actions that
restore up to five personal Condition Track steps. Neither restores HP, revives a
character, repairs a vehicle or permits acting while helpless.

Equilibrium costs one Force Point and clears all recorded persistent causes.
Jedi Counseling 114 explicitly confirms the printed "all debilitating Conditions"
and "normal state" wording. Its topic is marked RAW unchanged: disabling that
clarification does not invent an exception to the printed talent. Clearing a
lost limb's persistent injury does not regrow the limb or change its countdown.

Indomitable costs no Force Points. Each valid selection grants one daily use;
optional `recovery.indomitableSpent` records spending, never remaining capacity.
Legacy characters default to zero. Spending survives reloads, class/talent edits,
encounter changes, combat ending and eight-hour rest. New day resets it. It moves
the track despite persistent causes, while retaining those causes and their
ordinary Recover/natural-healing restrictions.

The Actions planner checks ownership, incapacitation, remaining uses, effect and
budget before mutation. Equilibrium obeys the existing one Force Point per round
limit. Queueing and previewing do not spend resources or move the actual track;
preview simulates the recovery and spending on its copy so later planned actions
see the resulting state. Executing invalid, stale or already resolved steps
changes no real state. Activation clears interrupted Aim/Brace/follow-ups, and a
return to Normal State clears unfinished ordinary Recover progress.
