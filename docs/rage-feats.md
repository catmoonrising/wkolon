# Rage feat contract

This contract precedes calculations. Channel Rage revision 21140 (Galaxy of
Intrigue) and Powerful Rage revision 19542 (Force Unleashed Campaign Guide) are
pinned and kept verbatim. Both require the species Rage trait; the existing
species Rage record supplies daily uses, duration and the Swift Action.

Channel Rage: "Once per day, instead of entering into a Rage, you gain a +5
bonus to your Will Defense until the end of the encounter. This bonus counts as
using your Rage ability for that day." A separate `channel-rage` action costs the
same Swift Action as Rage, requires an unused daily Rage (including Extra Rage)
and no active Rage or Channel Rage, and spends one daily Rage use. The saved
`recovery.channelRage` flag grants the feat's `{target:'channelRage',
defense:'will', amount:5, type:'untyped'}` effect. It is not a Rage: no Rage
bonuses, skill restrictions or post-Rage fatigue. End combat, new encounter,
New day, rest and death clear it. Losing the feat suppresses the bonus.

Powerful Rage: "+4 bonus to Strength checks and Strength-based Skill Checks when
Raging" uses `{target:'ragingStrength', amount:4, type:'untyped'}`. While an
actual Rage is active it adds to Strength ability checks and to every skill
whose resolved ability is Strength, with a breakdown entry.

Both records are Partial.

Channel Rage has a separate validated daily `channelRageUsed` flag in addition
to the encounter `channelRage` flag. It may be used once per day even with Extra
Rage uses remaining. Preview and execution honor this cap. New day resets it;
ending an encounter clears only the active bonus. A legacy known-active Channel
preserves that daily use when cleared. Ordinary Rage spending does not imply a
Channel use, and an absent legacy flag remains accepted by validation.
