# Claude automation goal

The user has authorized Claude to continue its own portion of official wkolon
rules automation, independently of Codex's integration work. The old overnight
08:00 deadline is historical. The current stop condition is 25% USED in either
Claude's five-hour or all-model weekly window. This replaces all earlier
75%-used stopping rules. Codex has the same cap on its own account separately.

Read AGENTS.md and docs/team.md. Keep one native /goal for this assignment.
Continue on claude/overnight-automation in the existing overnight worktree.
Claim the new CLAUDE-AUTOMATION parent task. First finish the incomplete
Skirmisher/Improved Skirmisher checkpoint, with meaningful legal fixtures,
movement boundaries, target-independent modifiers, turn expiry, reload/import
and isolated browser checks. Read its handoff and existing code before changing
it. Do not stop the overall goal just because that family is complete.

Afterwards, claim and implement other independent official families with data
contracts before calculations, pinned verbatim sources and local commits per
finished family. Preserve Manual/Partial status honestly. Do not edit other
worktrees, the pending substitution-reroll correction or Codex's integration
branch. Codex may review and integrate already handed-off immutable commits
while this worker continues newer work; do not rewrite the handed-off commits.
No pushing, merging into main, publishing, Homebrew, extra agents or API billing.
The existing configured Claude model and subscription stay in use.

Use the shared board's note/question/resolve/handoff commands. Persist open
questions in .build/automation-questions.md. Existing Shift Defense III and
other unanswered questions are still unanswered; do not infer approval from
this new assignment. Skip a blocked effect and continue independent work.
Ask the user only when independent work cannot continue, using AskUserQuestion
so the question appears in Claude's agent view. Record actual answers before
resolving any question.

Check the current Claude meters with the absolute quota-tool path supplied in
this session's goal before work, between families and during longer work. The
helper returns 75 when the cap is reached, 2 when usage cannot be verified,
and 0 below the cap. Neither error authorizes continued implementation.
A PreToolUse guard checks the same meters; fresh results are shared across
worktrees for at most 60 seconds. A separate local watcher stops this worker
if it reaches the cap or cannot verify its usage. These are workflow checks,
not provider-enforced plan limits.

Begin a checkpoint by 22% in either window. Keep notes current, save a local
commit only for verified complete work, and retain incomplete files. Write
.build/automation-handoff.md with base/head commits, completed and incomplete
families, source revisions, actual check results and questions, and hand it off
on the parent task when stopping. Stop at 25% used, a user stop, no unblocked
work, or unavailable usage meters. Do not retry or resume after a reset without
another user instruction. A quota stop is not whole-wiki completion.
