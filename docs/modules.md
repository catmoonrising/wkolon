# Sheet modules

The registry in src/sheet-modules.js defines 35 independent views. Languages and
Species Features are separate from Character. Feats, Talents, Class Features,
Force Techniques, Force Secrets and Medical Secrets each have their own module.
Feature views retain earned order, source text, secondary choices, inactivity and
Manual/Partial coverage. Dedicated Feats/Talents omit redundant (F)/(T) prefixes;
the combined builder reference retains them.

Destiny/Background and Force Traditions have separate modules. Their choices share
the existing character fields with creation; duplicate editor controls use distinct
radio groups/reference IDs. Background skills and languages still affect the same
rules replay. Destiny Points has a theme-colored bar with the existing heroic-level
cap and a Spend counter. Spending a point does not pretend to resolve a critical,
turn interruption or another Destiny effect. Those effects and Destiny fulfillment
remain pending automation.

The Modules menu in Layout supports explicit visibility preferences. Auto restores
relevance-based defaults: absent powers, techniques/secrets, memberships and story
choices need not occupy the sheet. Hidden views retain their mechanics, saved
choices, collapsed state and positions. Relevance may change by character without
forgetting a stored stack or its preferred active tab. An explicit visibility
choice overrides relevance. Layout settings do not alter character files.

src/module-layout.js validates and migrates both stored and imported layouts.
`moduleVersion: 2` and `visibility: {moduleId: boolean}` extend the existing map,
collapsed and stacks fields. No visibility key means automatic relevance.
Positions are finite/bounded, unknown future module preferences can be retained,
and duplicate/overlapping stack membership is rejected. Inputs are cloned so
validation/migration cannot mutate an imported object.

A legacy Features rectangle becomes a stack of its new feature views, preserving
geometry, folded state, neighbors, order and active tab. Explicitly placed or
already grouped new modules keep their preferences. Character's extracted views
can share its former rectangle. Fresh flow stays separate and receives no invented
positions. Migration is versioned, idempotent and persisted once; layout file import
and presets use the same migration.

Only visible members appear as tabs. A temporarily irrelevant member stays in the
saved group, ready for another character. Hiding a preferred tab chooses a visible
fallback without overwriting that preference. Hidden modules do not make the
arranged canvas taller, and newly relevant modules receive positions when needed.
The menu stays inside the viewport and supports Escape/outside-click dismissal.

The registry, visibility and feature extraction are independent of action spending.
The Actions module uses shared execution and typed costs; see actions.md. Other missing systems and
layout presets are tracked in modules-roadmap.md and TODO.md.

Validation for this batch: 569 JavaScript tests, the full Chromium browser
regression (including all 56 independent scenario helpers), and focused Firefox
checks passed. Checks cover module visibility without character mutation, saved
preferences, layout migration/import, stacks, theme/mobile menus, source popups,
Destiny Point spending and shared builder/sheet story choices.

Droid Systems shares the starting arm choices between creation and the sheet. It
declares installed parts, the active locomotion system and bipedal anatomy.
The separate starting allowance is available in the creation equipment shop.
Hiding the module does not remove parts or suspend their effects.

Starship Maneuvers has its own manager and manually tracked suite, separate from
Force Powers. Vehicles has a named owned-instance list and a lazy full-text
catalog; see vehicles.md. It is initially relevant to trained Pilots and characters
with owned vehicles, and is also accessible from creation's equipment tab.
