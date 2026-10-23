# Matukai defense contract

This contract precedes calculations. Matukai Adept Talent Tree revision 20482
(Jedi Academy Training Manual) supplies Body Control, Soft to Solid and Wan-Shen
Defense. Wan-Shen revision 20576 supplies the weapon. Attacks supplies Damage
Reduction's strongest-source rule and Lightsaber bypass; Combat Sequence
supplies turn and encounter timing. Keep these pinned articles verbatim.

## Body Control

The talent's passive effect is the existing defense-ability replacement:
`{target:'defenseAbility', defense:'fortitude', ability:'cha'}`. CHA replaces
CON as one selected modifier, never an additive bonus. Auto chooses the highest
eligible modifier; the saved Fortitude choice may select a lower legal one.
Resilient Strength's STR remains a separate option. Replacements of the
Constitution modifier apply only when Fortitude normally uses CON; a body with
no Constitution keeps its existing Fortitude ability. Damage Threshold follows
the resulting Fortitude Defense through the existing threshold resolver.

The immunity uses the existing encounter talent activation: one Swift Action
and one Force Point, one benefit choice, encounter duration. Its single effect
is `{target:'hazardImmunity', hazards:['poison','radiation','disease']}`. The
derived sheet exposes the active hazards. No Poison, Radiation or Disease
engine exists yet, so the talent stays Partial; hazard resolution is manual.
New encounter, End combat, New day and death-free resets that already end
encounter activations end it too. Losing the talent suppresses the state.
Repeating the activation while active is rejected.

## Soft to Solid

`rules.reactionTalentActions` binds a dispatcher ID to `talentId`, `trigger`,
`forcePoints`, `damageReduction`, `duration` and exact `sourceIds`. The record
is a Reaction costing one Force Point, triggered after the character is damaged
by an attack, granting DR 10 until the end of the character's next turn.

The trigger is a user declaration (`damaged: true`); the engine does not infer
an attack from a bare HP change. The DR applies only to damage resolved after
the reaction. Already applied damage is never rewritten or refunded.

Characters optionally save distinct `reactionTalents: [{id, endsRemaining,
ended}]`, using the shared turn-end duration helper. A reaction during the
character's own active, unended turn snapshots two turn ends. A reaction outside
that turn (turn ended or tracking inactive) snapshots one remaining end, already
marked ended, so the next own turn's end expires it. New Turn implicitly ends an
unended turn. A repeated reaction refreshes only when it extends the expiry and
never stacks DR. Losing the talent suppresses the benefit. Actions explains that
"you may only take a single Reaction to any one Action or effect", so the
shared trigger key also prevents Block or Deflect and Soft to Solid from both
answering the same declared attack.

The DR joins manual, species, class and timed talent DR in the existing
strongest-source resolver, including Lightsaber bypass and armor exceptions.
End combat, new encounter, New day, minute and eight-hour rests clear it.

## Wan-Shen Defense

`rules.turnTalentActions` gains a second record. Instead of `weaponGroup` it
names `weaponId: 'equipment:wan-shen'`; a distinct equipped, carried entry with
that ID declares a Wan-Shen in hand. Hand allocation remains manual. One Swift
Action grants +1 deflection per selection to Reflex against melee attacks while
aware, capped at the printed +3, until the start of the next turn.

The effect is `{target:'conditionalDefense', defense:'reflex',
against:'melee-aware', type:'deflection'}`. Its displayed total includes every
active while-aware contribution, so Lightsaber Defense and Wan-Shen Defense use
the shared highest-of-type deflection resolver instead of adding. The row is
shown only when it exceeds the while-aware row. Flat-footed or helpless state
suppresses it.

The saved amount, activation-only weapon reading, rank capping, refresh, reset
and preview behavior follow the existing turn talent contract. Makashi and the
Lightsaber Defense weapon-change alternative apply only to Lightsaber Defense.
Jar'Kai never doubles Wan-Shen Defense.

Wan-Shen Kata, Wan-Shen Mastery and Physical Surge are outside this family.

## Passive hazard immunity

Fortified Body (Force Adept Talent Tree, Core Rulebook) uses the same
`hazardImmunity` effect as a passive talent effect. The Defenses module and stat
block list active immunities. Applying them to hazards remains manual, so the
record is Partial. No other record may use this effect without review.
