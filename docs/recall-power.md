# Recall Power

Official Jedi Consular talent from Rebellion Era Campaign Guide, retained tree
revision26763, SHA256
`8467d26c7922a64c6284697d6ab72db6b796fdf4a209159bdbf7922c562b9ddb`.
Whenever a Force Point returns a power to the suite, the character regains two
powers instead of one. This stage covers Recall Power only; Renew Vision remains
unimplemented in its separate original draft.

The acquired talent gains closed effect `{target:"recallPower"}`. The existing
FP-based `recover-power` action and shared recovery resolver restore up to two
active expended suite copies for their unchanged one-FP cost and normal timing.
The existing `powerId` identifies the first copy. Optional saved `secondPowerId`
identifies a different copy. With one additional spent copy, it can be selected
automatically. With several, the action defaults to the first different eligible
copy and permits choosing another. With only one expended copy, recover that
one without inventing another use. With two or more, the printed replacement
requires two; the original draft's None option is not used to reduce the benefit.

Both chosen copies must be active and actually spent when the action executes.
Validate the complete choice before spending FP, consuming actions or restoring
either. Identical power names remain separate copies. The shared resolver and
cloned queue preview use the same plan; returning powers does not activate them,
reroll them or alter other copies. FP-round restrictions and action/history/save
behavior remain with the existing action engine. Forceful Recovery and Force
Focus do not trigger Recall Power because they do not spend an FP to return a
power. The retained article and source records remain unchanged.
