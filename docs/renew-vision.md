# Renew Vision

Official Knights of the Old Republic Campaign Guide talent, retained Jedi
Consular tree revision26763, SHA256
`8467d26c7922a64c6284697d6ab72db6b796fdf4a209159bdbf7922c562b9ddb`.
It requires Farseeing. Once per encounter, a Swift Action returns all expended
uses of Farseeing to the character's Force Power Suite.

`rules.powerRecoveryActions` contains the closed source-bound row with id,
talentId, powerId, action, frequency and sourceIds. The shared action catalog
exposes `renew-vision` (Swift, count1). Only a valid acquired talent can use it,
and only when at least one active, actually stored Farseeing copy is spent.
The existing shared restorePowerCopy returns each matching spent copy, without
FP cost, activating the power or altering other copies. Existing action rules
check consciousness, helplessness, turn phase and action budgets.

The optional saved `powerRecoveriesUsed: [actionId]` records encounter use.
Validation admits only unique IDs of reviewed encounter power-recovery rows.
Preview reserves use and restores matching copies only on a clone; execution
rechecks current sources, spent copies and budget before mutating. Source loss,
editing or removing/replacing a spent copy, death or revival cannot refund the
encounter use. New encounter, end combat, new day and eight-hour rest boundaries
clear it; ordinary turn changes and one-minute suite recovery do not.

No character choices or GM declarations are needed beyond the existing action
controls. The talent is marked Partial consistently with the current catalog;
Farseeing's check and world result remain with its existing controls. Original
POWER-RECOVERY draft includes Recall Power, tracked separately for integration.
