# UI text

Keep the UI laconic. Before adding a label, decide whether it gives the user
necessary information. Use the shortest wording that remains clear.
Use exact wording when the user supplies it.
Never use em dashes (U+2014) or middle dots (U+00B7) in user-facing text.
Use commas, parentheses or plain hyphens as appropriate. Apply this to controls,
logs, popups and displayed imported rules. Keep pinned source files intact;
normalize their punctuation only when rendering. Never overlabel controls.

Avoid instructions, redundant headings, repeated rule reminders, empty-state
sentences, and explanations of self-evident controls. Preserve accessible names,
units, limits, validation errors, and rules text needed to make a choice.
Keep detailed calculation breakdowns behind their existing disclosure controls.

Wkolon and pmcrwf are sister sites. Reuse pmcrwf's controls and styles where they
fit Saga rules. Prefer the GitHub Pages deployment when validating changes.

# Project rules

Implement official SWSE content only, except the user's explicitly requested
House Rules. Keep source articles verbatim on disk, with pinned revisions and
attribution. Define the rules-data contract before adding calculations. Reuse
shared bonus, prerequisite, action, resource and duration resolvers. Never imply
that a selectable option is fully automated. Record unsupported effects and
source conflicts in docs/import-review.md; preserve the user's recorded rulings.

Edit data/mechanics.json and reviewed compiler inputs, then regenerate
data/core.json with python3 tools/compile-core.py. Do not hand-edit the generated
pack. See docs/rules-data.md and the relevant feature contract before editing.

Use isolated browser contexts and fixtures, never the user's real roster.
Keep commits and public artifacts under the catmoonrising identity. Keep local
paths, credentials, private handoffs and private account information out of public files.

# Working together

Read docs/team.md and run python3 tools/team.py status before starting work.
Every implementation task has one owner, branch and worktree. Claim it before
editing. Do not edit another agent's worktree or run concurrent Git mutations
against it. Agree on contracts before changing shared schemas or resolvers.

Codex initially integrates and deploys; Claude implements claimed tasks and
reviews Codex changes. The other agent reviews each implementation. Only the
integrator updates main or publishes. A review request does not authorize fixes,
new implementation, merging, deployment or resuming a paused automation goal.

Use focused checks while developing and the combined regression suite for
integration. Report commands actually run, failures, skipped checks, remaining
manual behavior and rule sources. Handoffs must identify their exact base and
changes. Do not treat missing output, a timeout or a partial log as a passed run.

Shared task state lives in Git's common directory and is visible across local
worktrees. Chat histories and ignored .build files are not shared instructions.
Read the task board again at handoff. Respect each tool's usage limits and the
user's pause instructions; never restart work or bypass a cutoff through the
other tool without the user's instruction.

# Usage limits

Stop when 25% REMAINS (75% USED) in either the five-hour or weekly window,
separately for Codex and Claude. The user clarified that 25% meant remaining,
not used. This supersedes the mistaken 25%-used rule. Use
actual current service meters, not token estimates or extra usage since a task
started. Check before starting work and regularly while working. Checkpoint
before the cap, then pause at or above it; do not auto-resume after a reset or
route the stopped agent's work through the other tool to bypass its cap.
Claude reads its native subscription meters with tools/claude-usage.py; its
worker also has a per-session guard and an independent local watcher. Codex's
local .build/live-usage.py reads the app-server meters. If fresh usage cannot
be verified, pause that worker instead of assuming capacity remains.
