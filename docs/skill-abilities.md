# Skill ability contract

This contract precedes calculations. Mind of Reason uses its pinned official
Rebellion Era Campaign Guide article, wiki revision 20706. Keep the article
verbatim. Its Cerean prerequisite remains part of chronological feat ownership.

The closed effect `skillAbility` contains `from` and `ability`. The reviewed
initial pair is INT to WIS. Match the skill's printed base ability, not a
previous substitution. Select one ability modifier; never add the two together,
turn it into a typed bonus, transfer Skill Focus, grant training or change
trained-only and species restrictions. Negative modifiers remain modifiers.

Resolve native skill abilities before whole-check substitutions such as Trace.
A substituted Use Computer check therefore includes its own selected ability,
training and bonuses rather than the destination skill's. All consumers of
`derive().skills` use the same result, including Actions, rolls and stat blocks.

Optional `character.skillAbilities` maps known skill IDs to auto/INT/WIS. Validate
closed values and skill references; keep saved choices through feat or species
edits. Auto chooses the best eligible modifier, retaining the base on ties.
An explicit unavailable choice is retained and disables that native check until
corrected. Whole-check alternatives may use their own valid native result.
Show a compact ability selector in the existing Ability column only when an
alternative or retained choice exists. Existing whole-check source controls
remain separate. Show an unavailable choice and its reason accessibly.
