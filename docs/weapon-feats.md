# Weapon feat contract

This contract precedes calculations. Galaxy at War feats Pistoleer revision
20920, Riflemaster revision 20935, Disabler revision 20858 and Sport Hunter
revision 20955 are pinned and kept verbatim. Each grants a benefit "depending
on the kind of" weapon used, only "with which you are proficient".

The closed `weaponTrait` effect names one exact equipment ID and one change. It
applies to the resolved weapon before range and damage are read, and only when
the character is proficient with that weapon.

| Feat | Weapon | Effect |
| --- | --- | --- |
| Pistoleer | Blaster Pistol | Accurate |
| Pistoleer | Heavy Blaster Pistol | not Inaccurate |
| Riflemaster | Blaster Rifle | Accurate |
| Riflemaster | Heavy Blaster Rifle | damage dice d10 to d12 |
| Riflemaster | Light Repeating Blaster | effective Medium size |
| Disabler | Ion Pistol | damage dice d6 to d8 |
| Disabler | Ion Rifle | Accurate |
| Sport Hunter | Slugthrower Rifle | damage dice d8 to d12 |
| Sport Hunter | Slugthrower Pistol | +1 die at Point-Blank Range |
| Sport Hunter | Sporting Blaster Rifle | +1 attack when Aiming |

Accurate weapons use the existing Accurate range table. A weapon that is no
longer Inaccurate may attack at Long Range. Damage die changes replace only the
printed die size and keep the dice count, so extra dice and critical damage use
the new die. The Aim bonus is unnamed, joins the existing Aim-dependent bonus
and disappears from the un-Aimed variant.

Manual clauses: Hold-Out Blaster Pistol targets that have not acted, Blaster
Carbine Autofire Bracing, Ion Grenade burst
radius and Sporting Blaster
Pistol damage rerolls. All four feats stay Partial.

For Riflemaster’s Blaster Rifle Accurate clause, the folded-stock range switch
in rifle-ranges.md applies. Its damage-die clause is not a range benefit. Exact
equipment identity and resolved weapon proficiency remain separate requirements.

Additional size and Point-Blank die behavior is defined in
[weapon-feat-extras.md](weapon-feat-extras.md).
