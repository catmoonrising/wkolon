# Declared trigger contract

This contract precedes calculations. Pinned sources stay verbatim: Bothan Will
16347, Increased Resistance20674, Moving Target20710, Rebel Military Training
20747, Dark Side Talent Tree25735 (Revenge) and Mercenary Talent Tree26768
(Focused Warrior). All six records remain Partial.

`rules.triggeredDefenseBonuses` is a closed list of source, owned record, trigger,
typed effect(s) and duration. External events are declarations, not inferred
opponent state or geometry. Reuse Defenses Options for the source checkboxes.

| Source | Declaration | Effect | Duration |
| --- | --- | --- | --- |
| Bothan Will | Attack/check against Will failed | +2 circumstance Will | Start of next turn |
| Increased Resistance | Attack/check against Fortitude failed | +2 circumstance Fortitude | Start of next turn |
| Moving Target | Ended turn at least 3 squares from its start | +1 dodge Reflex | Start of next turn |
| Rebel Military Training | Running Attack moved before and after attack | +2 dodge Reflex | Start of next turn |
| Revenge | Equal/higher-level ally killed or reduced to 0 HP in line of sight | +2 Force attack and weapon damage | Encounter |
| Focused Warrior | Damaged an opponent | +5 morale Will | Start of next turn, lost if Surprised or Flat-Footed |

Turn rows save IDs in `triggeredDefenses`; encounter rows in `encounterTriggers`.
Validate IDs, scopes, arrays and uniqueness. Repeated declarations refresh, never
stack the same source. New Turn clears turn rows; ending a turn does not. Ending
combat, a new encounter or a new day clears both. Existing rest/reset services
clear through these same shared functions. Invalid input must not mutate state.
Unavailable feats/talents do not grant effects. Dodge rows are suppressed when
Dexterity is denied, as other Dodge bonuses are. Use the shared typed resolver.

Revenge uses closed attacks/damage Force effects, resolved with other typed
weapon damage bonuses for weapon attacks and their variants. It retains Dark
Side tree eligibility. Bellow, Force power and other nonweapon damage bonuses,
ally monitoring, movement endpoints and qualifying incoming failures remain
manual. No opponent state or automatic success is invented.

Focused Warrior (Mercenary Talent Tree revision 26768) follows the same declared
trigger contract: dealing damage grants +5 morale Will until the start of the
next turn. It remains Partial because damage to an opponent is declared. The
closed row has `lostWhenFlatFooted:true`. Surprised or Flat-Footed for any reason
removes the saved trigger, requiring a fresh damage event; ending that state
never restores the old bonus. An explicit saved Surprised phase counts even
with the Flat-Footed checkbox cleared. An Aware phase alone does not. The setter
checks both derived and saved state before mutation. Shared loss cleanup runs
on phase changes and render/load, including balancing and legacy saves. Other
trigger rows retain their own loss rules.
