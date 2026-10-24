# Passive defense contract

This contract precedes calculations. It covers reviewed passive and
conditional Defense bonuses from these pinned articles, kept verbatim:
Thick Skin revision 20795, Jedi Consular Talent Tree revision 26763 (Force of
Will), Bounty Hunter Talent Tree revision 16359 (Jedi Hunter), Poison
Resistance revision 19285, Scion of Dorin revision 20762, 5th-Degree Droid
Talent Tree revision 25025 (Environmentally Shielded), Warrior Heritage revision
20819 and Resolute Stance revision 21237. Bonuses and Penalties supplies typed
stacking.

Records use existing effects. `defenseBonus` adds a typed bonus to one Defense
through the highest-of-type resolver. `conditionalDefense` shows a separate
total against a declared context and adds only the increase over the base
total. The validator pins each record's exact effects; no other record may use
the new contexts without review.

| Record | Effect | Manual remainder |
| --- | --- | --- |
| Thick Skin | Fortitude +2 species | None |
| Force of Will | Will +2 insight | Swift/FP ally aura |
| Jedi Hunter | Fortitude and Will +1 insight | Extra die vs. Force Sensitivity |
| Poison Resistance | Fortitude +5 vs. Poison | Half damage on a hit |
| Scion of Dorin | Fortitude +5 species vs. Natural Hazards | None |
| Environmentally Shielded | Fortitude +5 equipment vs. environmental Hazards | None |
| Warrior Heritage | Will +2 morale while wielding an Atlatl or Cesta | None |
| Resolute Stance | Will +2 morale while Fighting Defensively | +5 if no attacks until next turn |

Warrior Heritage uses `when: 'wieldingWeapon'` with exact equipment IDs; an
equipped, carried entry declares a wielded weapon, as elsewhere. Resolute
Stance reuses the existing Fight Defensively condition. All eight records are
Partial: hazards, Poison and the listed remainders have no engine yet, and the
existing convention keeps calculated feats such as Toughness Partial too.
Conditional Fortitude contexts reach Damage Threshold through the existing
shared threshold resolver, like other conditional Fortitude bonuses.

## Additional conditional rows

Spacer Talent Tree revision 18516 (Cramped Quarters Fighting): "When adjacent
to an obstacle or barrier, you gain a +2 Cover bonus to your Reflex Defense",
shown as Reflex vs. `adjacent-obstacle` with type `cover`. Disgrace Talent Tree
revision 19643 (Unreadable): "+5 bonus to your Will Defense against Skill
Checks made to read your emotions and influence your Attitude", shown as Will
vs. `read-emotions-or-attitude`, unnamed. Unreadable's Feint clause remains
manual. Both are Partial and pinned by the validator.

Grab Back revision 21335 (+2 to Reflex Defense against Grab and Grapple
attacks) and Grapple Resistance revision 20181 (+5 to Reflex Defense when an
enemy makes a Grab or Grapple attack) use Reflex vs. `grab-grapple`, both
unnamed, so they add. Grab Back's counter-Grab Reaction and Grapple
Resistance's opposed Grapple check and held-object bonuses remain manual. Both
are Partial.

Force Hunter Talent Tree revision 20160 (Strong-Willed, Legacy Era Campaign
Guide): "You add your Class Level to your Will Defense against Use the Force
checks." Only the Bounty Hunter class has this tree, so Class Level is the
active Bounty Hunter level. The effect `{target:'conditionalDefense',
defense:'will', against:'use-the-force', type:'untyped', classLevel:
'class:bounty-hunter'}` resolves its amount from that level and shares the
existing "vs. Use the Force" row. Partial.
