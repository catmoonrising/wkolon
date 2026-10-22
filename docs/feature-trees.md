# Talent and feat selection

Feat selection and talent selection are separate screens, with one shared browser.
The browser uses existing typed prerequisite expressions and selection replay; prose
never determines eligibility. The active feat slot is evaluated before its own grant,
and class access and bonus-feat restrictions still apply. Earlier valid grants and
the active valid selection determine possession; future levels cannot unlock earlier
choices. Pending secondary choices confer no benefits.

Nodes group parameterized feats under one primary name. Secondary options appear
only after choosing that primary. Talent tabs use the existing tree IDs; feats
share one graph without categories. Grey nodes remain readable but cannot be
selected. Possessed nodes
are highlighted, and selectable nodes use normal styling. Eligible only keeps
possessed nodes for context. Prerequisite conditions (such as trained skills) are
read-only nodes. Multiple prerequisite arrows are conjunctive unless marked “or”.

Graph ranks follow prerequisite depth from left to right. Barycentric sweeps and
adjacent swaps reduce line crossings instead of sorting names alphabetically.
Read-only requirements are repeated beside the options that need them. A shared
ability or Base Attack Bonus threshold does not join unrelated feat chains. Actual
feat and talent prerequisites within the selection remain shared connections, including conjunctions
and alternatives. Disconnected branches occupy separate vertical bands, using
their own horizontal spacing and card widths. Long connections reserve invisible
rows through intervening columns, so curves do not cut through other cards.
Cards and waypoints align vertically toward their neighbours while preserving
their ordering and separation. Joins therefore sit among their prerequisites,
rather than automatically at the top of a column. Each branch's horizontal gaps
grow with the vertical distance its connections travel. The run is at least twice
the rise, limiting both the unsmoothed segments and the smoothed curves to 45°.
Arrows exit their branch's source column before bending.
Remaining curve intersections use overpasses: SVG masks cut a short gap in the
underpassing line while retaining the overpassing curve and its dash pattern.
Shared source branches and destination joins remain connected. Masks are in graph
coordinates, so they scale with zoom and reveal the active theme's background.
Cards fit their names; read-only prerequisites use smaller text and padding. Curves
and arrowheads share an endpoint; paths into unavailable nodes are dotted.
All cards start folded whenever a picker opens. Triangles expand verbatim mechanics
inside the card. Fold all and Unfold all use the same inline behavior. Measured
card widths and heights feed the layout, which reflows around expanded articles
without overlapping cards. Class and skill previews also start folded.

Choosing Force Training opens its level-specific power library immediately. Each
copy retains its own saved identity; taking Force Training again adds another
printed allotment at that level. The level table keeps power choices accessible
even when an edited build has more saved powers than its current entitlement.
Other secondary choices use their existing skill, weapon, power or talent controls.
Repeat eligibility uses the record’s repeat policy, choice grouping and printed
selection cap, rather than a separate UI-only permission.
Zoom ranges from 25% to 200%, with a reset button; scaled viewport bounds preserve
horizontal and vertical scrolling. Search matches names and verbatim article text,
retaining prerequisite ancestors. Filters, zoom and scroll positions are view
state, not character benefits.

Feature records use the same closed `article: {sourceId, blocks}` format documented
in species-selection.md. Redirected talent pages are extracted from their exact
heading on the pinned parent tree, ending at the next heading of equal or greater
rank. Reference Book attribution is retained. No generated mechanics replace source
text. Awareness adds Expert Tracker, Keen Shot, Reset Initiative, Uncanny Dodge I,
Uncanny Dodge II and Weak Point with explicitly reviewed typed prerequisites and no
automated situational effects. Existing IDs and saved files remain compatible.

The Core Scout/Soldier trees are now complete, including Camouflage, Fringer,
Brawler and Commando. Proficiency and Weapon Focus conditions connect to the
secondary choices for Devastating Attack and Penetrating Attack. Repeatable talents
remain selectable at later earned slots. Class tree access uses separately pinned
class-tree overview tables, including supplemental trees; other classes cannot choose these talents merely because
they meet a prerequisite.

Force Sensitivity adds the closed `nonDroid` prerequisite, evaluated against the
species' `isDroid` flag. It prevents the feat (and its class-skill access) from being
granted to a droid; it does not implement droid construction.

Validation: 559 JavaScript tests, 36 Python importer tests, the full Chromium browser suite and focused
Chromium/Firefox feature checks pass. The dense real feat graph is checked for
connections passing through cards and curves exceeding 45°. A ranged-feat
regression covers the Careful Shot/Deadeye and Precise Shot/Sniper joins.
Checks also cover local requirements, retained
feat chains, arrow tips, crossing gaps, stable rule dialogs, zoom, mobile themes,
selection replay and persistence.


The class/common Force catalog now includes all 1,036 sections from 146 trees.
Two reviewed Multiattack Proficiency reprints share their mechanical identity,
with `additionalTrees` retaining their access through both source trees. Separate
catalog entries keep each reprint's book and article. A shared talent counts once
toward prestige entry requirements even if both of its trees qualify. Tree tabs
use the source spelling, including punctuation and accented names.

The bulk import added 840 talents with Manual effect coverage. Five have since
received reviewed permanent grants and now carry Partial coverage. Typed prerequisites
still restrict selection. Unverified requirements retain their exact wording and
require saved confirmation; an unresolved alternative never becomes a narrower
mandatory branch. Manual selections do not acquire inferred numeric effects,
training, additional talents, memberships or hardware. Printed skill, weapon,
vehicle, item and other permanent secondary choices use the shared choice controls.
Temporary combat targets and crafting choices are not character-creation choices.

Light Side and Guardian Spirit are available through Force Sensitivity. Light
Side selections record acquisition DSS 0; later DSS suspends rather than deletes
their ownership, until DSS returns to zero. The inactive talent cannot meet a
current prerequisite.

All 122 talents in the 26 Force Tradition trees are selectable after declaring
membership and a joining level under Character Creation > Character. Multiple
memberships are allowed. Source popups preserve full admission requirements and
exceptions; numeric species/training/DSS requirements are also checked. The
joining level prevents retroactive talent access. Tradition talents count toward
Force-talent prestige prerequisites and still require Force Sensitivity. Their
effects remain Manual except for Many Shades of the Force (Partial). Many Shades of the Force offers only known powers with a
Light Side or Dark Side descriptor. Its descriptor removal applies to all suite
copies and automatic DSS on activation, while leaving source articles intact.
Five degree-specific droid tree pages remain references pending the droid model.
