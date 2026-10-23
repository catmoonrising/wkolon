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
