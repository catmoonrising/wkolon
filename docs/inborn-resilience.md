# Inborn Resilience

The pinned official Inborn Resilience article supplies a permanent Zabrak
species-bonus redistribution. It reduces one Defense's species bonus from +1
to +0 and raises another from +1 to +2, leaving the third at +1.

The feat has six enum choices, `reflex-fortitude`, `reflex-will`,
`fortitude-reflex`, `fortitude-will`, `will-reflex`, `will-fortitude`.
The first Defense loses its species bonus; the second gains the larger species
bonus. The saved feat selection uses the existing `{id, choice}` contract.
Prerequisites and acquisition remain governed by the shared advancement resolver.
No new action, resource, active-effect state or stacking category is introduced.
Only valid acquired feat selections affect totals and their existing breakdowns.

The feat is Partial because the build editor can revise a permanent build choice.
It is not presented as a switch during combat. Removing the feat or losing its
species prerequisite removes its effect, as for other invalid build selections.
