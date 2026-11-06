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

Both read the armor currently worn and proficient, so removing it suppresses the
benefit without ending the activation. The DR joins the strongest-source DR
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
must use the shared action engine, including consciousness, Flat-Footed and
own-turn restrictions. This integration stage still needs that wiring and real
legal-class/browser fixtures; the direct HP claim alone is not complete action
automation.

## Manual

Whether a Guardian Spirit is manifested is not tracked. The article prints no
requirement that it be manifested.
