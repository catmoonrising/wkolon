# Offensive Force powers

This contract precedes calculations. Preserve Force Slam revision 18194,
Force Blast 19447, Force Powers 18202, and Attacks 27406. Extend the existing
reviewed power/check/action/suite/FP pipeline and outgoing defense-range table.
These are Use the Force skill checks, so do not introduce weapon attack
bonuses, automatic natural-1 misses, natural-20 hits, criticals or consumption
of Battle Strike's next attack-roll bonus. Natural 20 still schedules the
normal end-of-turn suite recovery.

Force Slam uses one check for its 6-square cone in line of sight. A result
equal to or above a target's Fortitude deals 4d6 Force damage and knocks it
Prone; a lower result deals half, rounded down, without Prone. Its printed
Fortitude size modifiers are Large +5, Huge +10, Gargantuan +20, Colossal +50.
Do not invent a minimum activation DC. An optional FP adds 2d6. Use the shared
area miss/Evasion/Cover damage calculations; Evasion changes damage, not the
printed successful-check Prone condition. The weapon attack-roll minimum of
10 is not imposed on this skill-check comparison.

Force Blast must strictly exceed Reflex and also meet DC 15/20/25/30 for
2d6/3d6/4d6/5d6 respectively. A result under 15 has no effect. Its optional
FP adds half Heroic Level, rounded down, to damage. Preserve the activation's
Heroic Level through a pending decision, rather than recalculating it after
character edits. It is not an area attack and does no damage on a miss.

Do not require hidden enemy defenses as inputs. Display the final check,
rolled damage and defense ranges, with Slam's size adjustments available in
its result. Range, cone, sight, actual enemies, their HP/DR/SR and applying
Prone remain external to this character sheet. Keep both catalog entries
Partial; the new reviewed resolver is separate from generic suite support.

Force Powers also permits a lesser achieved effect. Blast offers its earned
damage tiers after the check, including when no FP decision is needed. The
player can cap the damage in advance or select a lower achieved tier before
resolving the saved result. Slam has no printed lesser damage tier.

Queue/preview never rolls or spends. Damage rolls once after the final FP
decision, whether that is no FP, a check bonus, or the power's enhancement.
These choices share the existing one-FP-per-round ledger. Preserve the original
check and snapshot on save/reload; completed steps never roll again. Invalid
rolls or state fail atomically. Route suite shortcuts and eligible Adept/Take
10 controls through the same path. Keep current powers and their saved states
compatible. An older pending manual power check without an effect snapshot
finishes under its saved manual behavior; do not invent retroactive damage or
an activation level. New executable results require their strict snapshot.
Preserve strict data/source validation, concise UI and offline operation.
