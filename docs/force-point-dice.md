# Force Point dice

Contract for records that change a Force Point added to one check or attack.
Sources are the pinned Feat and Talent articles named by each record.

Pinned revisions: Imperceptible Liar 20663, Master Tracker 20701, Nature
Specialist 20714, Sharp Senses 20766, Gungan Weapon Master 20657, Bowcaster
Marksman 16365 and Superior Skills Talent Tree (Skill Boon) 21261. Source
articles and their hashes remain unchanged.

## Data

- `{target:"forcePointCheckDie",skill,steps}`: Imperceptible Liar (Deception),
  Master Tracker (Survival), Nature Specialist (Knowledge (Life Sciences)) and
  Sharp Senses (Perception) at 2 steps. Skill Boon uses `skill:"$choice"` at
  1 step, resolved per selection.
- `{target:"forcePointAttackDie",weapons,steps}`: Gungan Weapon Master, Atlatl
  and Cesta, 1 step.
- `{target:"forcePointAttackDamage",weapons,type}`: Bowcaster Marksman, Bowcaster,
  competence damage equal to the amount added, on a hit.

## Resolution

A step moves d6, d8, d10, d12. The base is the character's Force Point die, so
Strong in the Force starts at d8. Steps add up and stop at d12. Skill Boon prints
that cap; the species Feats print only d6 to d10 and d8 to d12. Combining records
on one check is a reading, recorded in docs/import-review.md. The number of dice
rolled, keeping the highest, is unchanged.

`derive` returns `forcePointCheckDice` (skill to die) and `forcePointAttackRules`.
`forcePointExpression(d,{skill,attack})` is the only source of the context die.
Skill context follows that row's selected `checkSource`, once, just as the
skill resolver does. Force Perception uses a Use the Force check, so Sharp
Senses does not improve its die. A Skill Boon for Use the Force can improve it.
The existing substitution permission and application limits still govern which
check may be selected; no new substitution permissions are granted.

## Spending points

- Skills table: a skill with a stepped die shows its own Force Point button. It
  uses the existing `force-bonus` action, cost and availability, with
  `options.skill`. The Force Point stat button keeps the base die.
- Action checks use the die of the skill checked: Use the Force for powers and
  upkeep, Jump for jumps, and each skill action's `skillId`.
- An attack's `fp:"before"` uses the first routine step's weapon. Bowcaster
  Marksman adds the amount as that step's `damageMod`, which only applies on a
  hit, and also to a critical's flat modifier as any step modifier does.
  Its competence bonus joins the attack's existing applicable damage modifier
  rows through the shared typed resolver. It does not stack with another
  competence bonus; only the increase over that bonus is added. Declared target
  damage rows remain part of that same set. No permanent weapon changes occur.
  All Force Point rolls must be integers from 1 through the context die, with
  invalid results rejected before committing resources or action history.

## Manual

The check total is still added by the player when a skill's Force Point is spent
outside an action. Destiny Points and other effects that replace the Force Point
die are unchanged. Force Points added to an ability check have no context die.
