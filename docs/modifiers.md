# Modifier resolution and encounter talents

The pinned Bonuses and Penalties article (revision 16336) supplies the shared
stacking rule. Numeric contributions use `{amount, type, circumstance?}`.
Resolve each statistic and declared context independently. Positive bonuses of
the same type use the highest value, except unnamed and dodge bonuses, which
add. Circumstance bonuses add only across distinct circumstances; contributors
with the same explicit `circumstance` key compete. All negative amounts add,
regardless of type or source. Missing types mean unnamed bonuses.

The resolver returns a total and amounts by type. Conditional defenses resolve
against the bonuses already included in the base defense, then add only the
increase. This prevents a weaker conditional Equipment or Insight bonus from
stacking with an unconditional bonus already in the displayed total. Counters,
replacement ability modifiers, die steps, multipliers and action costs are not
bonuses and do not pass through this resolver.

Reviewed talent activations use `talents[].activation`, containing `action`,
`forcePoints`, `duration: "encounter"`, and distinct `choices`. Each choice
contains `id`, `name`, and numeric `effects` with an explicit `target`, `amount`
and `type`. This first format supports Fool's Luck's personal attacks, skills
and defenses only. Its vehicle defense benefit remains manual. Pinned prose
retains the final vehicle sentence's use of "luck", rather than rewriting it;
the three personal choices explicitly use Competence.

Characters save `talentActivations` as distinct `{id, choice}` pairs. Different
choices can coexist when activated separately and paid for. Activating an
already active choice provides no additional bonus. Effects apply only while
the talent remains active in chronological class/talent replay. Losing the
talent retains the saved activation without applying it. Reacquisition does not
charge another cost within the same encounter. Ending combat, starting a new
encounter or starting a new day clears all encounter activations; starting a new
turn does not.

The shared Actions dispatcher owns activation, action-budget and Force Point
checks, queue previews, resource spending, Aim/Brace invalidation and history.
Planning never spends real resources. Failed execution changes no character
state. This adds no bespoke activation controls to the talent tree or sheet.
