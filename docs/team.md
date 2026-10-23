# Codex and Claude

Codex initially owns integration and Pages deployment. Claude owns explicitly
claimed implementation tasks and independent reviews. These roles can rotate;
each task still has one writer and a different reviewer.

## Start

From either checkout:

```sh
python3 tools/team.py status
```

Local task state and reports live under `wkolon-team` in Git's common directory.
All worktrees see the same board. It is intentionally excluded from commits and
Pages. A file lock prevents two agents from claiming the same task. Claims are
durable across sessions and have no automatic expiry. Check the owner before
releasing an interrupted task; a missing chat is not proof the worker stopped.

The initial Claude checkout is the sibling directory `wkolon-claude` on branch
`claude/review-rerolls`. Start its assigned read-only review with:

```sh
cd ../wkolon-claude
python3 tools/team.py review
```

The launcher uses the installed Claude Code login and configured model. It gives
Claude only Read, Glob and Grep tools, disables MCP servers for this review, and
saves a structured report to the shared board. It does not change global Claude
settings. The launcher, rather than Claude, records the handoff. The reviewed
diff is fingerprinted so a changed target cannot receive an outdated approval.
Authentication or model errors leave the task blocked with its checkpoint.
Reviewing does not resume the paused automation goal.

## New work

The integrator adds a bounded task with a unique ID, source and acceptance
criteria. Use relative repository paths in public task descriptions. Example:

```sh
python3 tools/team.py add FORCE-INSIGHT --owner claude --branch claude/force-insight --description "Implement Insight of the Force from its pinned article, without granting permanent Knowledge training."
```

The worker creates a separate worktree for that branch, then claims the task:

```sh
python3 tools/team.py claim FORCE-INSIGHT --owner claude
```

Coordinate changes to data/mechanics.json, data/rules.schema.json, src/rules.js
and validators before implementation. Separate worktrees prevent overwrites,
but do not guarantee logically compatible changes. Regenerate core.json from
the reviewed inputs rather than merging generated JSON by hand.

The worker commits the change on its branch and writes a local Markdown handoff
with base/head commits, sources, behavior, remaining manual effects, verification
and questions. Record it with:

```sh
python3 tools/team.py handoff FORCE-INSIGHT /path/to/report.md --owner claude
```

The integrator reads the report path shown by `status`, reviews the actual diff
and sources, and requests fixes or integrates. A handoff is not an approval.
Only mark a task integrated after the actual merge and required checks:

```sh
python3 tools/team.py finish FORCE-INSIGHT --owner codex
```

An integrator can release an abandoned claim after confirming its process is
stopped with `python3 tools/team.py release TASK --owner codex`.

## Verification and handoff

Use Node 22 or later and Python 3. If Node is not on PATH, the local launcher
finds the existing Node installation under the user's cache. New machines can
install Node normally. The local setup is not an application dependency.

```sh
npm ci --ignore-scripts
python3 tools/compile-core.py
npm run validate
npm test
python3 -m unittest discover -s tests -p '*test.py'
node tools/validate-reference-library.js
npm run test:browser
```

During development, run the tests relevant to the change. Run the combined suite
when integrating a batch, then verify the deployed commit on Pages, including
offline behavior when affected. Do not run multiple complete browser suites
solely because both agents are active. State whether a process is still running,
failed or passed with a recorded exit status.

The first review concerns the saved substitution-reroll correction. Its input
is an uncommitted diff on branch `substitution-rerolls`, not a released build.
Inspect the seven explicit carryover grants, Force Perception's application
limits, independent reroll use/keep policies, source loss, schema validation and
test coverage. Check pinned articles rather than assuming current tests are RAW.
The implementation goal remains paused until the user resumes it.

## Live Claude work

Implementation sessions use Claude Code's native background sessions so their
progress and follow-up questions are visible without this chat staying open:

```sh
claude agents
claude attach wkolon-overnight
claude logs wkolon-overnight
```

In agent view, select the wkolon session and press Space to peek and reply, or
Enter to attach. Questions and permission requests appear under Needs input.
Permission dialogs require attaching. Closing the view leaves the session
running. The local machine must remain on and awake for overnight work.

The shared task board also supports progress notes, blocking questions and
explicit resolution through `note`, `question` and `resolve`; each takes the
task ID and `--owner`. A question is retained until explicitly resolved.
See [overnight-automation.md](overnight-automation.md) for the implementation
assignment and delivery requirements. Its exact deadline is stored locally on
the shared task board rather than hard-coded into reusable instructions.
