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
