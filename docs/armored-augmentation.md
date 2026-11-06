# Armored Augmentation and Vital Encouragement

Contract for two encounter benefits. Sources are the pinned Knight's Armor and
Guardian Spirit talent articles, revisions20227 and20429 respectively. Source
articles and hashes remain unchanged.

## Armored Augmentation

Armored Augmentation I uses the shared encounter activation: Swift Action, one
Force Point, until the encounter ends. Its effect, `{target:"armorAugmentation"}`,
adds the worn Armor's bonus to Reflex Defense to Damage Threshold. Armored
Augmentation II, `{target:"armorAugmentationDR"}`, adds Damage Reduction equal to
twice the Armor's Equipment bonus to Fortitude Defense while I is active.

Activation has `target: "worn-armor"`. The action's `armorUid` chooses one
currently worn, proficient suit from the shared armor resolver. If only one
qualifies it can be chosen automatically; multiple qualifying pieces require
an explicit choice. No armor means activation fails before any resource is spent.
The saved activation is `{id, choice, armorUid}`; other encounter activations
retain `{id, choice}`. The UID binds the benefit to that exact inventory entry,
including after save/reload. Missing, removed, unequipped or unproficient armor
suppresses the benefit without refunding its encounter use. Re-equipping the
same suit restores it; swapping suits does not transfer it. Armor improvements
are resolved from that suit through the existing armor resolver. The DR joins the strongest-source DR
resolver and does not add to other DR. The same resolved DR is used for the
normalProtection display and actual incoming-damage protection. The activation stays active for the
encounter, which gives the printed once per encounter.

## Vital Encouragement

`rules.bonusHPGrants` gains a row with `once: true`: base 10 plus half Heroic Level.
Claiming it records the row in the optional `bonusHPGrantsUsed: [id]`, and the claim
is then unavailable until `clearBonusHP` runs at the next encounter boundary. The
pool still replaces only when larger. The used ledger accepts only IDs of
once-per-encounter rows in the reviewed rules pack. Death clears the active HP
pool without refunding a spent encounter use; revival in that encounter cannot
claim it again. Explicit encounter/day/rest boundaries reset the used ledger.

Vital Encouragement is a Free Action. Its availability, queue and execution
uses the `vital-encouragement` action (Free, count 1), backed by its existing
source-bound grant row. Description, preview and execution use the same grant
availability check, including consciousness, helplessness, Flat-Footed and
own-turn restrictions. Execution claims the grant atomically with shared action
history; preview reserves its encounter use only on the cloned plan so duplicate
queued uses fail without changing the character. The HP button routes through
this action even before turn tracking has started. The other four declared-event
grants keep their existing repeatable behavior.

## Manual

Whether a Guardian Spirit is manifested is not tracked. The article prints no
requirement that it be manifested.
