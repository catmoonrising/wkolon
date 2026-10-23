# Overnight automation

The user has authorized Claude to implement independent official SWSE automation
overnight. This authorizes implementation and local commits in the assigned
worktree. Codex's separate usage-limited goal remains paused. Nothing from this
assignment may be merged into main, pushed, published or deployed by Claude.

Read AGENTS.md, CLAUDE.md, docs/team.md and the shared task board first. Work on
the assigned overnight branch only. Do not modify other worktrees, repair the
pending substitution-rerolls branch, spawn additional agents, switch accounts,
use API billing, or start unrelated work. Use the configured Claude model.

## Objective and stopping

Continue implementing official automation in coherent families, with reviewed
contracts, meaningful verification and a local commit for each completed family.
Do not finish the assignment merely because one family is complete. Start with
the Matukai defensive family below, then choose further unblocked official
families from TODO.md and the catalog's Manual/Partial records. Prefer families
that fit existing resolvers and do not overlap the pending skill-substitution
and reroll work. Do not do a general UI redesign or replace the architecture.

The exact deadline and parent task ID are supplied in the shared task board and
the session's /goal condition. Check local time before each substantial action
and test batch. Begin checkpointing 15 minutes before the deadline. At the
deadline, or if the user stops the assignment or Claude reaches its usage limit,
save progress, outstanding questions and actual check results, then stop. A
deadline stop is not a claim that all official wiki content is implemented.
Do not automatically retry a usage limit or continue after its reset.

Keep one /goal active for this assignment, including the deadline in its
condition. Do not replace it with a smaller family-only goal. If a genuine
blocker prevents one family, record it and continue a different independent
family. If no independent work remains, ask the user and wait. Do not invent
RAW or add Homebrew to avoid a blocker.

## First family: Matukai defenses

Use the already pinned Matukai Adept Talent Tree (Jedi Academy Training Manual).
Write the data contract before calculations. Initial records:

- Body Control: choose CHA instead of CON for Fortitude, without stacking the
  two modifiers; Swift Action and one Force Point for encounter-long immunity
  to Poison, Radiation and Disease. Reuse defense-ability selection and resource
  handling. Expose the immunity state honestly; if a hazard application has no
  engine yet, retain Partial status and document that limit.
- Soft to Solid: reaction after being damaged by an attack, one Force Point,
  DR 10 until the end of the next turn. Follow the pinned trigger wording and
  shared DR/duration rules. Do not retroactively rewrite resolved damage. If a
  source conflict changes the implemented trigger, ask about that point and
  continue other parts of the family.
- Wan-Shen Defense: Swift Action while holding the weapon, typed deflection
  against melee attacks, no benefit while flat-footed or unaware, repeated
  selections increasing the bonus to the printed maximum of +3, expiring at
  the start of the next turn. Preserve equipment eligibility and chronological
  prerequisites; do not treat deflection as a stacking untyped bonus.

These are acceptance targets, not substitutes for the original text. Read the
verbatim article and existing contracts before deciding implementation details.
Do not extend this family to Wan-Shen offense or Physical Surge without a
separate child task and contract.

## Progress and questions

Use the parent task for the overall goal, and add/claim a child task for each
family on the same overnight branch. The single worker completes these tasks
serially. Note progress after substantial milestones and before a long check:

```sh
python3 tools/team.py note TASK "Implementing the reviewed contract; focused checks next" --owner claude
```

For a blocking rules question, record the exact issue, source wording/revision,
candidate readings and the behavior affected on that child's task:

```sh
python3 tools/team.py question TASK "Question and its mechanical consequences" --owner claude
```

Mirror open questions in `.build/overnight-questions.md` and summarize them on
the parent task. Continue another independent family when possible. Do not
silently choose an unsupported reading. For an answer that blocks all remaining
work, use AskUserQuestion so Claude's agent view shows Needs input. The user can
open `claude agents`, select the wkolon session, press Space and reply, or use
`claude attach wkolon-overnight` for the full conversation. After an actual
answer is received, record it in the handoff, then clear that question:

```sh
python3 tools/team.py resolve TASK --owner claude
```

Progress and questions must survive chat compaction. Check the board and local
question file between families. Never mark an unresolved question resolved
merely because time passed or a different family became available.

## Verification and delivery

Use focused tests that would fail if the rule were wrong, including legal
fixtures, ownership loss, saved/imported state, action/resource preflight and
expiration boundaries. Reuse the existing isolated browser fixtures. Do not run
the user's roster or repeatedly run the full browser suite after every edit.
Run the combined checks for the final batch when time allows. Preserve live
test handles; a timeout is not proof a process stopped. Report exit codes and
actual failures, not a partial log as success.

Regenerate core.json with the offline compiler. Preserve pinned articles and
source metadata. Keep the user's concise UI conventions. Never label a feature
fully automated if parts still require manual resolution.

For every finished family, commit only its intended changes on this branch
using the existing catmoonrising Git identity, then write a Markdown handoff
under `.build/` with base/head commits, source revisions, implemented behavior,
remaining manual parts, check results and open questions. Record it via
`python3 tools/team.py handoff TASK REPORT --owner claude`.

Finish the overnight run with `.build/overnight-handoff.md`, including family
commits and incomplete working changes. Commit incomplete checkpoints only
when clearly identified as such; never discard them to make the tree clean.
Record the final handoff on the parent task, then stop and leave integration to
Codex. Checkpoints may be needed after sleep or a usage limit; do not assume the
whole overnight goal can resume automatically after its deadline.
