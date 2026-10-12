# Protection and offensive routines

Reviewed sources: [Attacks, revision 27406](https://swse.miraheze.org/w/index.php?oldid=27406)
and [Conditions, revision 24990](https://swse.miraheze.org/w/index.php?oldid=24990).
The CSV is a UI reference, not the calculation source.

## Rules data

`rules.combat` stores source IDs and numeric rules: `shieldLoss: 5`,
`shieldRecharge: 5`, `rechargeDC: 20`, `rechargeActions: 3`,
`naturalHit: 20`, `naturalMiss: 1`, `criticalMultiplier: 2`,
and `minimumDamage: 1`. Shields apply before DR. An attack strictly exceeding
the current SR reduces SR by 5, even if DR subsequently absorbs the remaining
damage. Equality does not reduce SR. DR is not consumed.
Shield recharge requires three swift actions and a successful DC 20 Mechanics
check, or Endurance when a droid recharges itself; it restores 5 up to maximum.
Condition penalties also affect Damage Threshold through Fortitude Defense.

## Saved state

Optional character `protection: {dr, drBypass, sr, srMax}` defaults to zero/empty.
Values are nonnegative integers; current SR cannot exceed maximum. `drBypass`
is a manual exception note, not executable rules. The damage form's Ignore DR
option handles lightsabers and other applicable exceptions. Applying damage
updates SR and HP; Condition Track remains manually managed.

Inventory entries may carry a stable `uid`. Old entries receive one on load or
import. It identifies the physical item, independently of its rules ID or row
index. Routine references survive item reordering and character export/import.

Optional `routines` is an array of `{id, name, steps}`. Each step stores
`{id, attackId, count, attackMod, damageMod}`. IDs are UUIDs, counts are 1–20,
and a routine has at most 100 attacks. Attack references resolve against currently
equipped weapons and current derived bonuses. Removed/unequipped attacks block
running until the user repairs the step; no attack is silently skipped.

## Resolution

Routines reuse the sheet's dice engine. Natural 1 always misses; natural 20
always hits; ordinary weapon attacks double the entire damage result, including
modifiers, or triple it for the selected Triple Crit weapon. Area attacks do not
critically multiply damage. Area rolls below 10 miss everyone; other area misses
deal half damage, rounded down. Separate columns show Evasion, cover and splash. Weapon
hits deal at least 1 damage before protection. The summary shows total damage
against each Reflex Defense interval before target DR/SR. Individual rolls stay
in a disclosure. An ordinary routine configures a sequence; it does not grant extra attacks
or waive action costs, range, cover or multiattack penalties. Step modifiers let
the user enter those circumstances. Force-power routines, target ion/stun effects and other special resolutions remain
manual. Net has no damaging routine resolution. Unresolved grenade ammunition
and unavailable range block the complete routine before any roll.

The UI reuses pmcrwf's named routine fieldsets, attack counts, one-click Run,
damage-by-defense summary and folded individual rolls. SR and DR are graphical
layers above HP: current/max SR, and persistent DR measured relative to max HP.

Full Attack routines select one base weapon and one weapon for each enabled
extra source: Two weapons, Double Attack and Triple Attack. The sources may be
reordered freely. The Two weapons source permits two one-handed weapons or both
ends of a double weapon; the feat sources use their chosen groups/exotic weapons.
The preview displays the combined attack penalty. Running records that penalty
on all attacks until Next turn, while ammunition, hits and criticals use the
ordinary routine pipeline. The saved mixed-proficiency interpretation is in
House Rules → Ambiguities. Action costs and physical weapon handling remain
player declarations.

## Resource bars and print

`rules.resources` holds `forcePointBase: 5` and `xpStep: 1000` with source IDs
for [The Force, revision 24972](https://swse.miraheze.org/w/index.php?oldid=24972)
and the pack's pinned Level Benefits table. Character `xp` and `darkSideScore`
are optional nonnegative integers, defaulting to zero. XP progress runs from the
current level's threshold to the next; it does not automatically advance levels.
Force Point capacity is 5 + half heroic level, rounded down, plus 3 with Force
Boon, and resets on advancement. The Roll button spends a point for the highest
result of 1/2/3 dice at levels 1/8/15; Strong in the Force uses d8s.
Dark Side Score's bar maximum is the current Wisdom score. The tracker does not
change GM control or infer narrative transgressions. Using an imported Dark Side
power records its explicit DSS increase.

The Stat Block button opens plain text with Copy and Print controls. Clipboard
copy falls back to text selection when the Clipboard API is unavailable.
Print and browser Print both generate a static character stat block. The order
and headings follow [Darth Vader, revision 25962](https://swse.miraheze.org/w/index.php?oldid=25962).
It includes current HP, SR, DR, condition penalties, equipped attacks and configured
routines, learned Force power copies, trained skills and earned feats/talents.
The selected Flat-footed state affects Reflex and dodge; a separate default
flat-footed stat and Grapple are not invented.
The catalog currently contains only heroic classes, so CL is total heroic level.
Print formatting is black on white and independent of saved module layout/theme.

Second Wind appears below HP, with remaining daily uses and an encounter limit.
New encounter and New day clear only their corresponding usage counters; they
do not heal HP, restore Force Points or remove persistent conditions. Force
Recovery adds its rolled healing without spending Force Points.

Wookiee Rage and Ithorian Bellow controls appear in Features. Rage's round counter
advances explicitly, persists across reloads and adds its persistent condition
on expiration. Recover is one complete three-swift-action recovery; its timing
is asserted by the player. Recuperation removes only the corresponding
persistent cause. Removing Second Wind exhaustion asserts completed Surgery or
eight consecutive uninterrupted hours of rest; track changes and natural
healing are still manual.

Bellow rolls against Fortitude and costs one condition step plus a step per
extra die. Ambiguities offers an optional Helpless cap; uncapped RAW is the
default. Large pools require an entered damage total rather than truncating
dice. Bellow and persistent conditions are included in stat blocks.
