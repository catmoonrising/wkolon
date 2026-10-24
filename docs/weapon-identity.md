# Weapon identity contract

This correction precedes calculations and follows the shared stock-consumer
source audit. Retractable Stock19749 changes proficiency and range when folded;
its explicit extended-stock grip rule remains separate. Weapon Focus and Weapon
Specialization match their selected weapon/group. Gunslinger18230 Trusty Sidearm
matches Pistols and adds half class level to damage. Keep sources verbatim.

Jedi Counseling112 Weapon Familiarity says the species trait applies to the
indicated group for all purposes, not just proficiency. That existing switch
is enabled by default. The disabled interpretation retains RAW familiarity for
proficiency but does not extend that trait to other weapon-group benefits.

Use a shared `weaponIdentityGroup(weapon, context)` for weapon-specific benefit
matching. Start with the catalog `printedGroup` (or `group` for an unresolved
catalog/virtual weapon); apply the existing familiarity mapping only when its
Counseling switch is enabled. Weapon Focus/Specialization still map an Exotic
group to the exact equipment ID and retain their other existing restrictions.
New rifle range/opportunity effects and Trusty Sidearm share this group resolver.
The saved folded-stock range ambiguity still overrides the range benefits it
names. Actual proficiency retains the existing resolved group/familiarity logic.

This changes effect matching, not equipment, ownership, proficiency feats, range
bands, grip or size. Preserve the explicit extended-stock one-handed penalty and
shared full-attack handling. Do not grant Weapon Focus selection eligibility from
owning a folded rifle; inventory-based acquisition needs a separate contract and
remains a recorded limitation. No character or rules-data fields are added.

Critical-threat weapon-group effects share this resolver; the present pack only
has Vaapad for Lightsabers, and no present familiarity map changes a weapon to
Lightsabers. Baseline opportunity eligibility still uses its existing Pistol
group and explicit folded-stock rule; the resolver changes the talent benefits.
