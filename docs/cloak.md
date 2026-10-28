# Cloak

Define this contract before calculations. Preserve Cloak19843, Force
Powers18202, Force Power Adept18180, Force Power Mastery18191 and shared
modifier/action/maintenance rules. Standard activation, Self. UTF15 grants
Total Concealment;20/25/30 adds+2/+3/+5 Force to Stealth. One special FP raises
the Stealth bonus by5, including DC15's base0. Typed Force contributions use
the shared maximum, not additive stacking across copies. Ordinary Defenses,
attack rolls, Speed and unrelated skills are unchanged. Report Total
Concealment; no fabricated NPC misses, immunity to attacks or global Blind.
Opponents' senses, targeting and miss resolution remain external, so Partial.

Extend the existing resistance maintenance family with a cloak kind. Keep old
Energy Resistance and Resist Force records, saved shapes, costs, DR and
Defense behavior unchanged. New cloak rows retain the activation's enhancement
and shared id/tier/used/maintained/untilTurn/pending lifecycle. Maintaining
costs Standard each turn and requires a NEW UTF check, whose achieved tier
sets that round's effect. A failed baseline releases only that instance. Each
maintained instance still requires its own DC15+damage check after damage;
reuse the existing saved check/FP/keep/release and cleanup mechanisms. No new
suite copy, descriptor cost or natural20 suite recovery for maintenance.
Activation Adept/Mastery/natural20 recovery remain shared.

User ruling: Adept applies to Cloak's new upkeep check by default. Add an
Ambiguities alternative limiting Adept to activation. Mastery explicitly covers
activation and is not extended to upkeep. Damage-triggered concentration
checks keep their existing common behavior. Upkeep Adept spends one FP before
its two rolls, keeps the better, and cannot also buy an ordinary FP bonus.
Normal upkeep may offer the shared after-check FP bonus, preserving the original
roll across save/reload. The activation's special+5 persists through maintenance;
upkeep does not offer a second special enhancement. General situational
Take10 outside Mastery remains manual as in other maintenance checks.

New Turn must preflight ALL chosen maintenance costs and FP choices on a
clone before any roll. Renew no-check powers through their existing path;
check-based upkeep may produce a saved waiting action, with later upkeep
queued until its choice resolves. The pending upkeep's old row is due/inactive
until the new result commits. Preserve prior queued plans and atomic failures.
Unknown selections, duplicate IDs, excessive Standard costs and incompatible
FP choices reject before mutation or random consumption. Unselected effects
expire; deaths/rest/day/encounter cleanup use shared paths.

Snapshot each upkeep's original effect id/power/enhancement so completion does
not spend/renew another copy or alter the retained enhancement. Saved current
checks require closed snapshots; old manual activation results gain no
retroactive Cloak effects. Active lesser tiers can be chosen until used; a new
upkeep check earns a fresh tier range. Partial/manual boundaries are explicit.
UI exposes Total Concealment and actual Stealth bonuses, terse tier/release
controls, new-turn upkeep check mode when a choice exists, and saved FP/keep
controls. Defaults remain folded. Cache docs/runtime, preserve pins verbatim,
verify mixed maintenance and stacking, original checks/atomicity, both FP modes,
Adept/Mastery distinction/ambiguity, damage/release/expiry, real controls/mobile/
offline, independent review and final combined/hosted gates before publishing.
