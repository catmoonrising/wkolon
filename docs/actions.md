# Actions contract

Rules metadata lives in rules.actionEconomy: source reference, the three normal
action slots, legal substitutions, Full-Round cost, and explicit action records.
Each record has a stable ID, name, action type, count, and source/rule reference.
Derived weapon reloads, powers and feature alternatives use their existing typed
metadata. Text labels never determine costs. Manual actions spend only declared
action time and do not claim to resolve their effects.

The Actions module starts turn tracking with Start turn or its first execution.
Before that, existing sheet controls remain usable outside turn order. Once a
turn is tracked, shared execution covers both the module and matching sheet
controls. Ending combat returns to untracked play without refreshing daily uses or deleting
completed history. Planning alone does not begin turn tracking.

Character actionState stores bounded, validated turn slots, reaction trigger IDs,
per-round Force Point use, Recover progress, a queue of stable action IDs/options,
and completed results. Full Attack stepping reserves its time once. Custom
routines require confirmation of their declared action cost. Queuing and preview never mutate play resources or roll.
Execution validates a cloned character, resolves one action, then commits its real
resource changes and result together. Invalid steps leave play state unchanged.
Resolved failures retain their costs. Completed steps cannot run again.

Aim costs two consecutive Swift actions in the same round. Recover spends one
Swift at a time toward three across the same or consecutive rounds. A Full-Round
action consumes Standard, Move and Swift. Standard substitutes for Move/Swift;
Move substitutes for Swift. Reactions declare an external trigger and allow one
reaction per trigger; Free actions are unavailable while flat-footed. No arbitrary
Free-action quota is invented. Charge ends the turn.

Optional check bonuses can pause execution after the original roll. Accepting a
Force Point rolls only its bonus, never the original check. Power effects remain
Manual/Partial wherever the existing implementation is incomplete. Queued powers
retain the chosen action and individual suite-copy ID, and revalidate both at use.

Available actions include attacks/routines, Charge, Running Attack, movement and
Tumble, Withdraw, prone actions, Aim, Brace, Mighty Swing, Second Wind, Recover,
Rage, Bellow, reloads, Total Defense, powers and power recovery, opportunity
attacks, Cleave/Follow Through, shields, Balance and short Escape Bonds attempts.
Run, Ready, drawing/holstering, item manipulation and speech have explicit Manual
entries. Other declares manual action time. Long skill/power durations still
require resolution outside the turn tracker.

Source articles are available from the action menus. The power enhancement prompt
tracks a declared one-point expenditure after the check; the player confirms the
printed effect and its success/target conditions manually. It never invents an
effect or claims that all power effects are automated. Negate Energy additionally
checks flat-footed state and declared awareness.

New Turn refreshes normal actions and calls the existing expiry/round hooks,
including opportunity quotas, without refreshing encounter/daily abilities.
Pending plans survive New Turn; finished results remain in history.

Validation: 596 JavaScript tests, 36 Python tests, rules/reference validation and
deterministic offline compilation passed. The full Chromium regression passed,
including the new Actions scenario. Focused Firefox covers planning, action and
ammo spending, existing sheet controls, saved results, FP decisions, Reaction
triggers, character isolation and Dracula mobile layout.
