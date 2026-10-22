# Droid chassis creation

Custom Droid and stock chassis are separate creation routes. Specific printed
standard-model PCs are deferred; their Nonheroic levels and 5,000-credit limit
must not be applied to chassis.

The eight Scavenger's Guide to Droids chassis use pinned Medical Droid 21070,
Astromech Droid 15988, Mechanic Droid 21068, Protocol Droid 21087, Service Droid
21109, Battle Droid 16166, Probe Droid 21085 and Labor Droid 21061. Droids 26658
supplies the stock-chassis creation steps and the 10% system-swap rule.

Chassis are species records with printed adjustments, fixed size, printed
locomotion speeds, degree and matching talent-tree access, languages, bonus
training/feat choices and source articles. Do not apply Custom Droid degree or
size adjustments a second time. All use the existing five-score generation
profile and no Constitution; ordinary Droid Force restrictions remain intact.
Hardwired Design supplies extra training outside class skill allotments.
Conditional Skill Focus supplies one chosen feat, only while its skill is trained.
Protocol/Service choices grant actual Skill Training feats with their normal
eligibility; Battle's two choices use existing starting-feat eligibility.

`droidChassis` stores `systems`, a list of stable `{slot,id}` grants, optional
`units` for capacity, `speed` for a printed locomotion speed, and `alternatives`
for Mechanic Droid's three printed locomotion choices. `swapTolerance` is 0.1.
No Custom Droid allowance is granted. Supplied equipment is free and has ordinary
installed effects. Class starting credits buy upgrades and additional equipment.
Printed native locomotion overrides the generic system's usual size-based speed
where they differ, particularly Mechanic Droid's Wheeled speed of 6.

Each supplied item keeps a unique UID and a `droidGrant` with species ID, slot
and native `baseId`. Repeated renders, reloads and returning to a chassis do not
grant equipment again. Deleting a grant does not reclaim it. Swaps retain the
UID and original native cost basis, preventing successive 10% swaps from
escalating value. Printed native alternatives may change that basis. Price
comparisons use physical size, capacity and locomotion installation number.
Unknown source prices, such as Magnetic Feet's installation-dependent price,
cannot silently authorize a free swap. Provided non-processor starting systems
use the Droid starting-equipment carrying exemption.

Size and speed changes need GM approval. Native printed systems retain their
printed speeds. Other locomotion that changes a chassis's speed remains an
unresolved choice until the saved GM-approval declaration is enabled. Chassis
ability modifiers and degree remain fixed regardless of installed equipment.

The existing system installation controls, inventory, armor, sensors, appendage
attacks, skill restrictions and class/level progression remain shared. Biological
immunities, recharge/maintenance and shutdown retain their existing support
status until their separate action automation is implemented.
