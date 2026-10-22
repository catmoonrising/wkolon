# Talents lasting until the next turn

`rules.turnTalentActions` binds an Actions dispatcher `id` to a `talentId`,
`amountPerSelection`, `maximum`, `weaponGroup`, `doubleTalentId`,
`doubleWeaponCount`, a typed `effect` and pinned `sourceIds`. Time comes from the
shared action registry. The first reviewed record is Lightsaber Defense: one
Swift Action, +1 deflection to Reflex per selection, capped at +3. Jar'Kai doubles
that bonus when activated while wielding two Lightsabers.

Existing equipped/carried/activated weapon declarations determine wielded and
ignited Lightsabers, exactly as for Niman and Lightsaber Form powers. A stack's
quantity does not declare additional wielded weapons, and one Double-Bladed
Lightsaber is not two Lightsabers. Hand allocation remains manual.

Characters optionally save distinct `turnTalents: [{id, amount}]`. The amount is
snapshotted when the talent is used. The printed activation requirement checks
wielded Lightsabers at activation, and Jar'Kai says "When you use" Lightsaber
Defense; later weapon edits do not rerun or refund that activation. Losing the
talent suppresses its benefit; losing ranks or Jar'Kai caps the saved benefit to
what the current choices permit. Acquiring extra ranks never raises a saved
activation above its original amount. Repeating an activation only grants an increase
when the new bonus exceeds the still-active bonus; it never stacks with itself.

The bonus is conditional on awareness, so Defenses and stat blocks show a Reflex
"while aware" total. Flat-footed or helpless state suppresses that bonus even
when Uncanny Dodge preserves Dexterity. The ordinary Reflex total remains usable
for attacks to which Lightsaber Defense does not apply. Deflection contributions
use the shared highest-of-type resolver; Niman's unnamed bonus still adds.

Start of the next turn clears the activation, including legacy Next turn,
tracked New Turn, new encounter, New day and long-rest resets. End turn does not
clear it. Ending tracked combat also clears it. Queueing and previews only mutate
a copy, and invalid execution spends no actions or real resources. Active turn
talents appear in Actions and in the printed stat block.

The saved `lightsaber-defense-weapon-change` ambiguity defaults to the printed
activation-only reading. Its alternative requires a currently wielded, activated
Lightsaber throughout the benefit. It suppresses the bonus while none qualifies;
wielding an active Lightsaber again can restore the benefit only within the
original duration, never after the next-turn reset.

Makashi is a current, conditional increase to the saved base activation. With one
one-handed wielded activated Lightsaber, add two up to five without reducing an
existing higher bonus. Grip and current weapon size use the same helper as Full
Attack. Switching weapons reevaluates Makashi without spending an action or
resnapshotting Jar'Kai. It remains one typed deflection contribution, and no
activation means no passive bonus.
