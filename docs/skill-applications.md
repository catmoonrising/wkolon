# Bonuses for particular skill uses

This contract precedes calculations. Preserve Veteran Spacer revision 20816
(Rebellion Era Campaign Guide), Master of Disguise 21209 (Galaxy of Intrigue),
and Revolutionary tree 21239 (Bomb Thrower, Galaxy of Intrigue).

Veteran Spacer grants +5 species to Use Computer only for Astrogate aboard a
Starship. Master of Disguise grants +5 insight to Deception for creating a
Deceptive Appearance, with a -2 penalty instead of -10 when rushing. Bomb
Thrower grants +5 unnamed to Mechanics for Handle Explosives. Offer these
specific uses beside the owning skill's check, with General as the default.
Selecting a use declares its context; it does not roll or spend actions.

Store optional `skillApplications` choices, keyed by skill ID. Validate each
choice against its exact skill and a closed application registry. Unsupported
or malformed IDs fail import. A known saved choice whose source disappears
confers no benefit. Preserve shared typed bonus competition against the native
skill's ordinary modifier rows. A replacement skill uses its own modifier rows;
these initial application bonuses require their named native check source.
The native `total` stays unchanged; only the selected sheet check uses
`checkTotal`. General checks, other skills and unrelated actions keep their
existing totals.

Skill check tickets retain their selected application and total. Rerolls keep
that modifier and intersect application-specific permissions; a changed use or
source invalidates the ticket. Do not broaden conditional rerolls into other
applications. Save/reload preserves the choice, not an outstanding reroll ticket.

Bomb Thrower also exposes a Full-Round action to craft one equivalent Frag
Grenade from declared appropriate supplies. Queueing does not create an item or
spend actions. Running preflights ownership, supplies, action budget and inventory
limits before atomically adding one carried, unequipped grenade. Credits and
Force Points do not change. Supply acquisition and depletion remain external
declarations because the source gives no priced material quantity. Equipment
laws and licensing remain the existing inventory behavior. All three entries
stay Partial; movement, disguise time and encounter positioning are external.
