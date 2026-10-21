# Campaign rules

The user supplied these campaign rules. They are separate from published
optional rules, Jedi Counseling, and ambiguity interpretations. Their text
does not replace the revision-pinned wiki articles.

Saved settings use `character.houseRules.campaign`, with boolean keys from
`src/campaign-rules.js`. Omitted keys are off. Existing characters retain their
current behavior until a switch is enabled.

| Rule | Location | Behavior |
| --- | --- | --- |
| Planned Generation (25 points) | Settings | Requires point buy with a 25-point budget, including five-score droids. Fixed species scores remain fixed. |
| Average Hit Points | Settings | Uses the mean hit die after first level, rounded up. First level retains the class maximum. |
| Average starting credits | Settings | Claims the mathematical mean of the starting class's credit roll once, with no dice roll. |
| Skill Focus | Settings | Competence bonus is half character level, rounded up, in place of +5. Other competence bonuses compete through the existing modifier resolver. |
| Reprogram | Settings | Reprogramming a droid must result in a legal build that's achievable without using Reprogram. Manual ruling; no retraining history or retraining action is currently implemented. |
| Dark Side characters | Settings | The player may keep playing when Dark Side Score equals Wisdom. Manual ownership ruling; the sheet has no transfer-to-GM workflow. All DSS-dependent requirements remain in force. |
| Daily Force Points | Optional Rules | Published daily pool, Force Boon adjustment, New day refresh, and no refill on level advancement. |

Planned Generation preserves stored scores and the former editable budget.
An existing character using another method receives an unresolved choice
until the player chooses point buy. Changing generation method still resets
the pool through the existing explicit control. Enabling Average Hit Points
changes derived HP without rewriting stored HP rolls; disabling it restores
their use. Constitution and other HP modifiers apply normally. Enabling
average credits alone never changes money or refunds purchases.

Daily Force Points is sourced from The Force, revision 24972, Daily Force
Points (Jedi Academy Training Manual), retained verbatim in the optional
catalog. Level bands are 1-5: 1, 6-10: 2, 11-15: 3, 16-20: 4. A valid Force
Boon adds 1 rather than 3. Class per-level Force Point pools do not contribute.
Species and class prohibitions still apply. New day replaces the current pool
with its maximum and discards unused points. Rest, New encounter and
advancement do not refresh it. Selecting the first class initializes the
first pool; higher-level creation can start a New day after the build is set.
Enabling the switch clamps an existing pool without refilling it. The daily
input and saved-state validation enforce its maximum; spending uses the same
stored current pool as the displayed value. Existing Force Point dice, power
costs and the one-per-round rule continue to apply.

Rulings marked Manual record the campaign policy. They do not claim to
automate GM adjudication or a workflow the app does not yet implement.

## Average HP source verification

The captured Level Benefits article, revision 26144, has an Average Result
column giving 6 + Constitution for Jedi/Soldier, 5 + Constitution for Scout,
and 4 + Constitution for Noble/Scoundrel. This confirms the wiki's displayed
round-up values. The passage does not explicitly authorize replacing the die
roll with that average. The user believes this is a published optional rule
and requested verification after the wiki outage ends. Live access returned
403 on 2026-10-21. Until permission and provenance are confirmed, this switch
stays in Settings as a user-supplied rule, without claiming official optional
status. Recheck live sources when available, then move it to Optional Rules
if warranted.
