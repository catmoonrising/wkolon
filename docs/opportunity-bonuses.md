# Opportunity attack bonus contract

This contract precedes calculations. Carbineer Talent Tree revision 20110
(Opportunity Fire, Shoot from the Hip) and Melee Duelist Talent Tree revision 19253 (Advantageous
Strike) are pinned and kept verbatim. Attacks of Opportunity follow the
existing [opportunity rules](combat.md).

The closed `opportunityAttack` effect adds a bonus only to the attack roll of an
Attack of Opportunity planned through the shared opportunity action:

- Opportunity Fire: `{target:'opportunityAttack', amount:2, type:'untyped',
  weaponGroup:'rifles'}`, for attacks made with a Rifle.
- Advantageous Strike: `{target:'opportunityAttack', amount:5, type:'untyped',
  mode:'melee', proficient:true}`, for melee weapons the character is
  proficient with.

Shoot from the Hip ("You can always use a Rifle to make Attacks of
Opportunity") uses `{target:'opportunityWeapon', weaponGroup:'rifles'}`, adding
Rifles to the weapons that may make Attacks of Opportunity. Match the derived
`printedGroup` for these effects: folding a stock changes proficiency and range,
not whether the weapon is a Rifle for these attack effects. Preserve the
existing resolved `group` for proficiency and range consumers.

The bonuses are unnamed, so they add to each other and to Opportunistic
Shooter's existing bonus. Ordinary attacks, routines and stat-block attack
totals are unchanged. The opportunity breakdown names each source. Existing
quotas, cover, concealment and weapon eligibility apply first. All three records are
Partial under the existing marker convention.
