# Modules and actions

Make each module independently movable, resizable, collapsible and hideable.
Keep character data independent of layout. Hiding a module must never remove
its mechanics, resources or action eligibility. Existing layouts need a migration
that preserves positions and collapsed state when a module is split.

| Area | Independent modules |
| --- | --- |
| Identity | Character, Appearance, Personality, Languages, Senses |
| Advancement | Classes, XP, Ability Scores, Trained Skills |
| Features | Species Features, Class Features, Feats, Talents, Force Techniques, Force Secrets, Medical Secrets, Force Traditions |
| Combat | Actions, Attacks, Offensive Routines, Defenses, HP, Damage Threshold, Condition Track, Speed, Grapple |
| Resources | Force Points, Destiny Points, Dark Side Score, Destiny/Background, limited-use features |
| Possessions | Inventory, Credits, Armor, Weapons, Ammunition, Droid Systems, Crafting and Upgrades |
| Other actors | Companions and Followers, Vehicles and Starships, Piloting Maneuvers |
| Utilities | Notes, Event Log, House Rules, reference library, stat block |

These are module boundaries, not a requirement to show every module at once.
Empty optional systems should be available through layout controls. Modules can
share views and underlying services; splitting Feats and Talents must preserve
their chronology, prerequisites, full rules popups and Manual/Partial status.
Keep all controls laconic and use pmcrwf's layout, theme and persistence patterns.

Support saved Creation, Combat, Exploration and Piloting layouts, plus custom
presets. Reuse module stacks as tabbed groups. Offer compact and expanded views
without creating separate state. Eventually allow several instances of a filtered
view (for example, equipped weapons beside ship weapons), and companion/vehicle
views bound to their own actor. A pinned action or resource is a view of its
original record, never a duplicate counter. Keep these conveniences separate
from completing the missing rules and selectable catalogs.

## Registry and migration

Use stable module IDs and a registry of title, renderer, applicability and fresh
layout visibility. Layout preferences remain separate from character/rules data.
Allow explicit show/hide as well as relevance-based defaults for optional systems.
The renderer must not grant, remove or spend anything. Retain one shared feature
collection with earned level and origin, then filter it into each feature module.
Omit redundant (F)/(T) prefixes inside a dedicated Feats/Talents module.

For a saved layout, migrate the old Features rectangle into a tab stack containing
the new feature modules. Expand Features in an existing stack in place, keeping
the other members and their order. Transfer position, size and collapse state,
and map the old active member to Species Features. Existing separate-module
preferences win over inferred migration. Fresh layouts can show separate modules.
Languages can initially share the old Character rectangle as a stack on migrated
layouts; users can separate it with the existing tab-drag interaction. Version and
validate migrations so they run once and also work on imported layout files.

## Actions

Use Full-Round, Standard, Move, Swift, Free and Reaction as menu buttons. Each
menu exposes currently relevant actions, their actual costs and any required
choices. Aim displays its two-Swift cost. Prefer one shared action catalog to
separate lists implemented independently by the sheet and the planner.

An action definition needs stable ID, source, action cost, availability, choices,
resource costs, preview and execution. Reuse existing implementations for Charge,
Withdraw, movement, Aim, Brace, Second Wind, Force powers and attacks. A displayed
rules reference is not evidence that its action is automated. Unimplemented
options must retain a clear Manual marker and must not pretend to spend or roll.

A turn plan stores action IDs and choices, not a second copy of character state.
Adding/reordering actions only updates previews. Execution validates each step
against actual current state before spending, rolling or applying effects. Once
a roll occurs, preserve it and its real costs/results, including failures. Stop
before an invalid later step while keeping completed steps. Never reroll completed
steps merely because a plan is edited, reloaded or resumed. Log each resolved step.

Force Point choices belong to individual powers/checks, with optional and mandatory
costs distinguished. Support legal after-roll choices without rolling the original
check again; a step can await that choice before the plan proceeds. Validate action
substitutions, multi-action costs, remaining
ammunition, movement, and per-turn/round/encounter limits. Reactions need their
trigger declaration and retain their own rules; a Free action is not automatically
unlimited. Do not invent targets or assume success on an opposed check.

New Turn reuses the existing turn-expiry/reset functions. Per-round attacks of
opportunity must follow their existing limits and rulings. It must not reset
encounter/daily resources. Preview action spending before committing a queued
step. Planning and immediate execution should use the same dispatcher.

## Implementation order

Finish the current pinned talent import and membership access. Then establish a
module registry and split Languages and Features, with layout migration. Add
Destiny/Background play controls and an Actions shell backed by already automated
actions. Expand the action dispatcher while automating remaining mechanics.
Implement Droid Systems, Companions/Followers, crafting/upgrades, and the vehicle,
starship and piloting catalogs with reviewed data formats before calculations.
Do not delay selectable official content for exhaustive ambiguity searches.

The first registry/migration batch is implemented; see modules.md. It includes the
feature/language split and dedicated story, point and tradition modules. Actions now provides turn accounting, shared execution and queued plans; see
actions.md. Additional systems, saved activity presets and repeated filtered
instances remain work to implement.
