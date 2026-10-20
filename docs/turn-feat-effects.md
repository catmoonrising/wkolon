# Feats lasting through turn ends

`rules.turnFeatEffects` records Anointed Hunter's feat ID, qualifying movement
displacement, typed thrown-attack bonus, duration ambiguity and pinned sources.
The feat body grants +1 competence until the end of the current turn; the
Nelvaanian species table says the end of the next turn. The body is the default.

The Move/Tumble route optionally records `displacement`, the distance in squares
between the starting and ending positions, not distance traveled. It defaults
to zero (no qualifying displacement declared), is bounded by route squares, and
only matters when the character possesses Anointed Hunter. A completed Move
with displacement at least 2 activates the bonus automatically. Failed or
unconfirmed movement does not. Queue previews activate only their simulated
copy. Other movement actions remain manual for this feat until their actual
endpoint declarations are integrated; no qualifying position is guessed from
their route length.

The optional saved `turnFeatEffects: [{id, endsRemaining, ended}]` records one
active entry per reviewed effect. Activations snapshot 1 or 2 turn ends and
refresh, rather than stack, a repeated use. `ended` ensures repeated End turn
clicks do not consume a second turn. New Turn implicitly ends an unended turn
before opening the next; legacy Next turn uses the same hook. Charge's early
turn end also consumes one end. Combat/encounter/day/rest resets clear effects.

The attack contribution uses the shared highest-of-type resolver. It applies
only to resolved ranged/thrown profiles, including weapons switched to their
thrown mode, never their ordinary melee profile. Losing the feat suppresses the
effect. Saves retain the original expiry after a house-rule change; a later
qualifying Move may refresh it under the new setting.
