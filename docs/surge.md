# Surge

This contract precedes calculation and UI integration. The pinned Surge article
is revision 18539 (`source:wiki-surge`). General Force Powers, Bonuses and
Penalties, Jump and Combat Sequence supply activation, stacking, movement and
turn rules. No Homebrew enters the executable record.

`rules.movementPowers` stores reviewed self-targeted movement effects. Surge uses
a Free Action. DC 10/15/20 grants +10/+20/+30 Force to Jump and +2/+4/+6 Speed
until the start of the next turn. A failed baseline still spends its suite copy
and action, but creates no effect. The final check includes a selected after-roll
Force Point bonus; a lower achieved tier may be chosen explicitly.

An enhancement spends one Force Point for +10 Jump and +2 Speed. A Destiny Point
adds +4 Speed and allows all movement for the round as Jump without a Jump check.
The Destiny option is independent of the enhancement, so both may apply when
resources permit. Neither option may bypass a failed activation. Final decisions
must commit resources and saved effects together, without rerolling a check or
charging twice after reload. Queue previews spend no real resources.

The Jump Force bonus already includes the increased-speed adjustment. Apply the
Force bonus through the shared highest-of-type resolver; do not also add a speed
adjustment arising from Surge. Speed increases have no descriptor and use the
unnamed-increase rule. Effects also supply a running start for Jump DCs. Existing
armor, load, Condition Track and immobility restrictions still apply; the power
does not grant a new locomotion mode or revive an inoperative droid.

Optional `movementPowerEffects` rows snapshot
`{id, powerId, maxTier, tier, enhanced, destiny}`. The activation ID is the action
step UUID. Achieved tiers and resource choices never recalculate after an ability
change or recovery of suite copies. Lesser-tier selection may not exceed the
achieved tier. Repeated uses retain separate snapshots. New Turn expires all
start-of-next-turn snapshots; End turn alone does not. Minute/eight-hour rests
and a new day expire them. End combat does not invent elapsed time.

The shared Actions path must support native suite Use, Take 10 and Adept, including
initially inactive turn tracking. Own-turn Free activation must not borrow an
off-turn Reaction allowance. Saved pending decisions block execution of subsequent
actions until committed. Controls for tier, enhancement, Destiny and expiry must
remain concise. Manual removal refunds neither points nor spent suite copies.

Integration must cover movement budgets (Move, Withdraw, Charge and Running
Attack), the Jump skill and substitution rules, falling/Jump Down checks, a
running-start-aware Long/High Jump application, and Destiny's no-check movement.
Stat blocks, displayed speed and saved/offline characters must agree with the
same effect state. Keep the power marked Partial while any printed component
still requires manual resolution. Do not advertise the contract or helpers as a
finished power before this integration and verification are complete.

## Long and High Jump movement

`rules.jumpMovement` pins Jump revision 18311, Skills revision 26694 and Move. It records 1.5 metres
per square, a four-square running start, DC per metre 3/12 for Long/High Jump,
a standing multiplier of two and a sufficient vaulting pole's high-jump
multiplier of one half. Running-start distance actually covered is included in
movement cost; Surge supplies the benefit without inventing travelled squares.

A saved `jump` declaration selects kind, metres, running-start squares, pole,
Move count (one or two), check mode/entered total, and calm/safe declarations.
Long/High Jump uses the normal locomotion Speed; one/two Move actions budget
one/two times Speed. Jump distance plus run-up must fit that budget. No flight or
new locomotion mode is created. A failed check spends the declared action but
does not invent a landing square, fall height or damage. The user can apply an
actual fall using the existing Falling controls.

Take 10 uses trained Jump plus lack of pressure, or an existing native species
permission. Take 20 requires safe retries and twenty times the normal duration;
it resolves outside tracked turns, where claiming it as one turn is rejected.
A short-lived Surge cannot supply its bonuses throughout Take 20 retries.
A Destiny-enhanced Surge omits Jump checks entirely, including entered rolls,
Take 10/20 restrictions and check Force Point spending, while retaining movement
and incapacitation restrictions. The action checks applicable current bonuses,
including skill substitutions, exactly once; after-roll Force Points can alter
success before final resolution. Running and Jump components of Charge/Running
Attack retain their existing controls and increased Speed budgets; this Jump
application does not invent a combined attack.

A queued movement power defers dependent movement previews until its check is
resolved. It does not predict a successful tier or spend real resources.
