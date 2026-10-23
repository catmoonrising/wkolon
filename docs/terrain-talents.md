# Terrain movement contract

This contract precedes calculations. Surefooted comes from Survivor Talent Tree
revision26659. Move revision18374 supplies normal/diagonal movement. The existing
pinned Charge, Acrobatics, Running Attack, Withdraw, Balance and Follow Through
contracts keep their action/check/trigger requirements.

`rules.terrainMovementAbilities` lists reviewed active talents, the boolean
`ignoreDifficultTerrain` permission, and pinned sources. Derive the permission
from chronological, active ownership. Do not change the character's base Speed,
armor/load reduction, condition penalty or native locomotion declarations.

Surefooted removes movement surcharges for actual Difficult Terrain. Diagonals
still cost two squares. Low objects are a distinct obstacle, so their surcharge
and Charge checks remain. Existing path fields `difficult` and
`diagonalDifficult` include terrain or obstacles. Optional `lowObjects` and
`diagonalLowObjects` are subsets of those fields; they distinguish the obstacle
portion when terrain is ignored. Validate integers and subset bounds. Existing
saved paths without the new fields mean zero declared low-object squares.

Apply the existing native Droid locomotion profile once, then remove the
Difficult Terrain surcharge where Surefooted or a successful Cross Difficult
Terrain check applies. Do not discount it twice, change native speeds, or grant
walking/wheeled movement the flying system's permissions. Existing low-object
costs under native locomotion are retained rather than silently reinterpreted.

The shared movement cost must reach ordinary Move, Tumble, Charge, Withdraw,
Running Attack, Balance and Follow Through, including preview labels, action
budgets, logs and reloaded/queued declarations. Retain Tumble's multiplier,
Sokan's separate rule, Charge's minimum displacement and straight-line checks,
low-object DCs and the saved difficult-terrain ambiguity. Surefooted changes a
cost, not the physical terrain type or a character's training. Explicitly
requested checks still resolve; their success cannot grant another discount.

Show low-object subset inputs when the talent is active or a saved count is
present, keeping them available after an earlier selection is edited. Use the
existing folded Terrain controls and the same concise labels as Charge. No new
activation button, persistent toggle or explanatory banner is needed.
