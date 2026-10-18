# Remaining species contracts

Species mechanics remain separate from pinned wiki presentation. These fields
describe reviewed choices before connecting them to calculations.

`droidBody` declares a species-specific body, independently of Custom Droid's
`droidStartingPackage`. Its `processor`, when present, names the provided Basic
Processor. `speed` is `species` for a printed speed or `manual` for an unspecified
shell speed. `bonusSystems` lists the exact six Replica Droid options, with
`bonusSystemCount: 2`. No Custom Droid allowance, degree modifiers, size ability
modifiers, locomotion or arms are silently granted to Replica Droid.

Shard's `droidBody.allowedSystems` is an explicit equipment-ID list assembled
from its printed categories and pinned communications/sensor memberships.
`sourceIds` preserves those category sources. Its speed is null in the pack.
Characters declare optional `shellSpeed` in the per-species Droid Systems state;
until declared, speed displays as unknown and movement cannot be automated.
Shards retain Constitution and ordinary Force access, have `usesDroidSystems`
instead of `isDroid`, and count as `cybernetic` for Ion damage. `repairOnly`
prevents ordinary healing and Second Wind. Force Repair's Force Trance and Vital
Transfer exceptions remain manual until those effects are automated.

Replica bonus equipment uses `droidGrant` slots `bonus-1` and `bonus-2` and the
body's exact option list. Free choices need not spend class credits. The Custom
Droid carrying-weight exemption does not extend to another species implicitly.
Provided processor weight remains explicit. Native appendages are not invented.

`bonusForceTraining` declares Sorcerer of Rhand's unconditional bonus feat and
its required descriptor, minimum fraction and forbidden descriptors. Its powers
can be partitioned from the ordinary Force Training pool: enough known powers
must be non-Light, and at least the rounded-down half must be Dark Side powers.
Ordinary training may still supply Light Side powers. Existing training grants,
their prerequisites and level-by-level replay remain separate.

`gmQualities` declares the minimum and maximum number of GM-provided qualities.
Characters save per-species `speciesQualities` entries with a name and rules text.
These have Manual effects. The application does not invent qualities or import
wiki Homebrew. Open spoken-language choices use the same bounded plain-text
validation as understood-language choices without confusing speech and comprehension.
