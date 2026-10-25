# Shoto Focus contract

This contract precedes calculations. Lightsaber Combat Talent Tree revision 26712
(Shoto Focus, Jedi Academy Training Manual): "Whenever you wield both a
one-handed Lightsaber and a Short Lightsaber (or Guard Shoto), you gain a +2
competence bonus on attack rolls made with the Short Lightsaber (or Guard
Shoto)." Keep the pinned article verbatim.

`{target:'shotoAttack', amount:2, type:'competence', weapons:['equipment:short-lightsaber','equipment:guard-shoto'], partnerAmbiguityId:'ambiguity:shoto-focus-partner'}`
adds a competence bonus, through the shared typed-bonus resolver, to attacks
with a listed weapon while a different wielded, activated partner Lightsaber is
one-handed under the shared Full Attack grip rule (current size, no two-handed
declaration).

Partner scope (correction after review): the pinned text's "one-handed
Lightsaber" links to the standard Lightsaber article (wiki/Lightsaber), so the
default partner is the standard Lightsaber (`equipment:lightsaber`). The phrase
can also be read as the generic Lightsaber category. Per the user's instruction
to offer alternatives for recorded ambiguities, `ambiguity:shoto-focus-partner`
offers `any-one-handed`: any other one-handed activated Lightsaber entry,
including a second Short Lightsaber or Guard Shoto. The earlier hybrid rule (all
named Lightsabers except short blades) is withdrawn. Wielded means equipped and
carried; quantities do not create a second wielded weapon; an inactive
Lightsaber does not count. Other short or named Lightsabers are not listed by the
text and are not inferred. The Guard Shoto is a manual-attack catalog weapon with
no derived attack row yet, so its bonus remains manual until that weapon is
automated; it still counts as a listed blade. The record is Partial.
