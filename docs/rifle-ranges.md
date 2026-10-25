# Rifle range contract

This contract precedes calculations. Carbineer Talent Tree revision 20110
supplies Close Contact and Rifle Master; Weapon ranges and the existing
Accurate/Far Shot/scope behavior come from the [combat contract](combat.md).
Keep the pinned articles verbatim.

Both apply to printed Rifles, including carbines. Retractable Stock revision
19749 changes proficiency and range only. Keep the catalog group in derived
`printedGroup` and the existing resolved `group` for proficiency and range.
The user ruled on 2026-10-24 that Close Contact, Rifle Master and Riflemaster
range benefits still apply with a folded stock by default. Ambiguities offers
`pistol-ranges`, excluding those range benefits when folded; the default is
`rifle-benefits`. Neither option changes proficiency, ordinary Pistol range
bands, or non-range Rifle effects. The switch is saved per character through
the existing House Rules service. No catalog or inventory record is rewritten.

Close Contact: `{target:'pointBlankRange', weaponGroup:'rifles', amount:5,
maximum:10}` per selection (two selections at most). Point-Blank Range ends 5
squares later per selection, to the printed maximum of 10; Short Range starts
correspondingly later and still ends at the same distance. Point-Blank Shot and
every other Point-Blank consumer use the extended band.

Rifle Master: `{target:'accurateWeapons', weaponGroup:'rifles'}`. Rifles use the
existing Accurate penalty table, including its Far Shot, Jedi Counseling and
scope interactions. An Inaccurate Rifle keeps its Long Range prohibition.

Stun settings with a fixed stun range are unchanged. Both records are Partial.

Runtime Rifle-group benefits also use the existing Counseling112 familiarity
conversion through the shared weapon identity resolver; see weapon-identity.md.

## Old Faithful

This section precedes calculations. Carbineer Talent Tree revision 20110 (Old
Faithful, Legacy Era Campaign Guide): "The Trusty Sidearm Class Feature of the
Gunslinger Prestige Class also applies to any Rifle or carbine that you use."
Gunslinger revision 18230 (Trusty Sidearm): "a bonus on Damage rolls equal to
one-half their Class Level (rounded down) when wielding a Pistol".

`{target:'trustySidearmGroups', weaponGroup:'rifles'}` adds Rifles (carbines
are Rifles) to the groups receiving the existing Gunslinger `pistolDamage`
class passive. Matching uses the shared `weaponIdentityGroup` (printed identity
plus the Jedi Counseling 112 familiarity switch), so a folded Rifle still
qualifies and the folded-stock range alternative does not affect it. The amount
is unchanged: floor(Gunslinger level / 2), zero before level 2, with no extra
proficiency requirement. A weapon receives the bonus at most once. The record
is Partial.
