# Declared trigger contract

This contract precedes calculations. Pinned sources stay verbatim: Bothan Will
16347, Increased Resistance20674, Moving Target20710, Rebel Military Training
20747 and Dark Side Talent Tree25735 (Revenge). All five records remain Partial.

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

Focused Warrior is excluded. Its separate pending loss review must be resolved
before implementing that talent; this batch does not change its Manual status.
