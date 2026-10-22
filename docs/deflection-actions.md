# Block and Deflect contract

This contract precedes calculations. Lightsaber Combat Talent Tree revision26712
supplies Block and Deflect. The pinned Lightsaber Forms Talent Tree supplies
Soresu. Sonic Damage revision26734 supplies its ranged
Sonic exception. Attacks revision27406 supplies ordinary area damage and protection
ordering. The already imported Jedi Counseling105/106 passages remain in House
Rules; the current pinned Core Block paragraph already contains its melee-area
rule, so disabling Counseling must retain that printed RAW behavior.

Block and Deflect are Reactions requiring the corresponding active talent, an
available Use the Force check, awareness, no flat-footed state, and a drawn,
ignited, wielded Lightsaber. Compare the check inclusively against the declared
incoming attack roll. Each attempt takes -5 for every prior Block or Deflect
attempt since the beginning of the acting character's last turn. Block and
Deflect share this counter. A reroll is not another attempt. Neither a new round
nor ending combat invents an own-turn start or erases the prior attempts.

Single ordinary attacks negate on success. Block's melee area attacks and
Deflect's Autofire/Force Lightning cases take half damage on a hit and none on a
miss when the check succeeds; failed checks resolve normal attack damage. Other
ranged area attacks use Deflect's opening ranged-attack permission without an
invented pure-Energy restriction. General area miss/cover/Evasion/minimum-roll
rules still apply. The user declares the attack type and hit outcome; do not
infer an external enemy's complete attack state from a bare number.

Evasion halves damage on an area hit and prevents damage on an area miss. Retain
the distinct reductions from successful area deflection and Evasion, rounding
down when applying each reduction. Force Lightning that still hits also retains
its additional Condition Track step, or two steps when its attacker spent the
enhancing Force Point. Route these steps through the incoming-damage engine so
incapacitation and maintained powers resolve consistently with the HP change.

Deflect cannot negate a purely Sonic ranged weapon. Added Sonic damage on a mixed
weapon remains on a hit, while the ordinary component follows deflection. A saved
numeric Sonic component is required to calculate that remainder; a single Sonic
boolean cannot describe both components. Capital-ship attacks from Colossal
(Frigate) or larger vehicles require their printed Point-Defense exception.
Block is a melee permission; do not silently apply the ranged Sonic restriction
to every melee attack that also has Sonic damage.

The actor may spend one FP as a Reaction to defend an adjacent character. The
point pays for the attempt even if its check fails. Such a reaction never damages
the actor's HP or drains their shields; show the remaining damage to be applied
to the ally before that character's defenses. Do not charge the actor for the
ally's separate survival FP. Self-targeted failures use the existing incoming
SR/DR/bonus-HP/Stun/Ion/threshold/death engine exactly once, including Balance and
maintained Resistance checks. Protect all commits from partial mutation.

Soresu may reroll a failed Block/Deflect check. Use the existing shared skill-reroll
policies for replacement versus keeping the better roll, per-check source use,
Knack's daily capacity, and compatibility. Snapshot allowed sources, original
bonus/DC, all actual checks and used source IDs. A source acquired after the
original roll cannot authorize a new reroll of that saved check. No reroll
increments the deflection penalty or consumes a new Reaction trigger. Optional
rerolls must finish before damage or success effects commit; reloading cannot
create a fresh roll. A Reaction does not gain the ordinary Free-action FP bonus.

The declaration must preserve raw damage, attack total, ordinary/area/Autofire/
Force Lightning mode, hit/miss, cover, Sonic component, capital/Point-Defense
context and self/adjacent target. Actor-only timers/counters are saved separately
from the immutable queued declaration. The optional Saber Locks rule and Redirect
Shot have their own resource/target workflows; this contract does not claim those
additional features are already implemented.

UI should share the existing pointer action forms and incoming-damage declaration,
keep unavailable reactions visible, expose the current cumulative penalty, and
reuse the shared saved-check decision controls for legal rerolls. Validate printed
talent access and weapon readiness from current state, but do not reroll or
rebuild an already captured check when resuming a saved decision.
