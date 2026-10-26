# Conditional awareness and ally damage

This contract precedes calculations. Pinned sources stay verbatim: Justice
Seeker revision 20684, Mercenary Talent Tree revision 26768, Order of Shasa
Talent Tree revision 25727 and Jedi Sentinel Talent Tree revision 26765.

Justice Seeker and Combined Mercenary Fire each add an unnamed +2 to damage
against a declared target. Their distinct conditions are respectively that the
target damaged your ally, or was damaged by your ally, since the **end** of your
last turn. Both bonuses add. Ruthless Mercenary adds another unnamed +2 after
you have exceeded that target's Damage Threshold with damage from a melee or
ranged attack, for the remainder of the encounter. Its triggering attack does
not receive the new bonus. These are target declarations, not inferred combat
events; managing the ally windows, threshold trigger and encounter duration
remains manual. Existing non-area weapon resolution handles the bonuses.

Resist the Dark Side adds a +5 Force bonus to each Defense against powers with
the Dark Side descriptor, or any power originating from a Force-user whose
Dark Side Score equals Wisdom. Conditional totals use the shared typed bonus
resolver, so an existing Force bonus contributes only the increase to +5.
The player identifies whether the incoming power qualifies. Ordinary Defenses
remain unchanged.

Deception Awareness adds an unnamed +5 to Will against Deception. Its additional
`skillSubstitution` effect replaces Perception with Use the Force only for
Sense Deception and Sense Influence, declares `carryRerolls: true`, and uses
`when: 'senseDeceptionInfluence'`. `grantsTraining: false` deliberately prevents
its purpose-limited training clause from granting ordinary Perception training,
a +5 native modifier, Skill Focus qualification or prestige-class entry.
The selected Use the Force modifier already includes its own actual training.

Original Perception rerolls retain their source identities, keep policies,
limits and application restrictions, intersected with these two applications.
Scent, Sensors, Avoid Surprise and Notice Targets cannot gain permission from
this talent. When Force Perception is also active, there is one Use the Force
choice and the broader four-application permission remains available. Losing
either talent recomputes its permission; losing all substitution sources falls
back to native Perception without invalidating the saved character.

All records remain Partial: target declarations and opposing actors are manual,
and generic skill rolls do not resolve an opposing character's information.
