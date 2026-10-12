# Protection and offensive routines

The Attacks module's Target disclosure applies declared cover, concealment,
Prone, Helpless and adjacency to an ally to weapons and offensive routines.
Prone + Helpless defaults to +10 melee; House Rules → Ambiguities offers +5.
The PC's own Prone state is in Defenses and applies −5 to melee independently.

Cover adds to the opponent's Reflex instead of lowering the attack roll.
Result ranges say "Reflex (before cover)" when that bonus is applied, including
routines whose first Aimed shot bypasses it. The area minimum of 10 uses the
actual roll; misses against a covered target deal no damage. Different targets
in an area require their own declared context, rather than sharing one target's
conditions. Declare Burst/Splash cover from the area center, Autofire cover from
the attacker; adjacent opponents never receive normal cover from the attacker.

Normal darkness is ignored by Low-Light Vision or an Aimed low-light scope;
Darkvision also ignores total darkness. Other concealment still applies.
Total Cover blocks a routine before dice/ammunition changes. Total Concealment
requires Attack square and −5, without claiming the chosen square is occupied.
Aim requires line of sight and is unavailable against such a concealed target.
The selected opponent's context is omitted from the general printed stat block.
Map geometry, falling/standing actions, attacks of opportunity, and target Dex
changes from Helpless remain declarations; Helpless already adjusts the PC's
own Reflex on their sheet. Bellow's separate Fortitude routine remains outside
this weapon-target mapping pending review of its cover interaction.

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

Defenses → Options contains Fight Defensively, Total Defense and owned Melee
Defense/Dodge controls. These are player declarations of the required actions;
Melee Defense does not roll or grant its Standard Action melee attack. The saved
stance and attack penalties last until Next turn. Total Defense disables weapon
rolls, routines and Bellow without spending ammunition or rolling dice. It also
clears Aim, Bracing and Mighty Swing when declared as a nonattack Standard Action.
Offensive Force power effects and the wider action budget remain manual.

Dodge accepts a named opponent. Separate Reflex rows show that opponent,
movement-related attacks of opportunity and the combined case. Losing the
Dexterity bonus removes all dodge bonuses; Uncanny Dodge preserves them against
flat-footedness but cannot override helplessness. Helpless uses Dexterity 0 for
Reflex only. Its checkbox covers bound/sleeping targets; 0 HP or the bottom of
the Condition Track applies it automatically. The rules disclosure retains the
complete Helpless passage. The opponent's +5 melee bonus remains a target-side
modifier to declare manually pending target-context controls.

Melee attack Options → Charge configures movement and makes one Charge attack.
Normal terrain costs one per square and difficult terrain costs two. Improved
Charge permits turns. Low objects and Cross Difficult Terrain offer the required
Acrobatics checks; leave the total blank to roll, or enter a check resolved at the
table. The map's path, occupied enemy squares and any reactions remain manual.
Charge cannot Tumble, and no further actions may be taken that turn; the result
log records that restriction. It is separate from Full Attack routines.

Powerful Charge adds +2 attack and half level damage to the single attack, in
addition to Charge's +2 competence bonus. Bonuses do not persist on later attacks.
The −2 Reflex penalty remains until Next turn, including after a failed obstacle
check. A failed attempt clears Aim/Bracing but makes no attack, spends no ammo
and does not consume Mighty Swing. Improved Charge retains the Reflex penalty.

Entered Charge Acrobatics totals are consumed by one attempted check and cleared
on Next turn; movement/path preferences persist. Reloading before the attempt
retains the pending entered total, without reusing it after the action.


Attacks of Opportunity has a separate round counter. Combat Reflexes increases
its maximum by the current positive Dexterity modifier and allows flat-footed
opportunities. Melee weapons, pistols and weapons with folded retractable stocks
qualify; Unarmed Attack requires Martial Arts I. The separate Squares field
sets the opportunity attack's range without changing the weapon's ordinary range.
Cover prevents the attack even with Aim; Total Concealment prevents it even
when attacking a known square, subject to species vision. Existing attack and
ammunition modifiers still apply. Failed preflight consumes nothing; a miss
consumes the attack and its ammunition.

The player names the opponent and the particular provoking action, then
confirms that it occurs inside their threatened area. Names identify distinct
opponents/events; case and surrounding spaces do not distinguish identities.
This is a declaration, not a grid simulation or automatic opponent action log.
Moving several squares is a single provoking action. Both the per-opponent and
per-action limits apply by default; Ambiguities also offers either limit alone.
Changing interpretation never replenishes the spent round quota. Next round
resets the history and same-round Mighty Swing, preserving until-next-turn
penalties. Next turn does not reset opportunities. New encounter/day and an
eight-hour rest reset the counter. Withdraw and Running Attack use the action controls below.


Speed → Withdraw records a Move Action with a total half-Speed budget. The
first grid square must clear every threatened area by the shortest route;
only that square is protected from opportunities. The confirmation declares
that geometry. Later squares can provoke. Total Defense permits Withdraw;
helplessness and straining prevent its Move Action. The action clears pending
Aim and Brace, preserving turn-limited penalties and same-round Mighty Swing.

Owned Running Attack appears in each weapon's Options. Before/After record
physical grid steps; the combined movement cost must fit the selected Speed.
The action rolls one weapon attack with the ordinary current penalties and
spends its ammunition atomically. Movement before it clears Aim and Brace in
the calculation view; movement only after it preserves those benefits for the
shot, then clears the declarations. Unavailable attacks roll no dice and
consume nothing. Native Swim uses its adjusted speed, and straining cannot
supply Move Action movement. Range still describes the target at the attack's
position; the sheet does not infer routes, directions, obstacles, enemy
reactions or remaining turn actions. Source text remains available locally.

Terrain counts are disjoint: Diagonal excludes difficult terrain, Difficult
excludes diagonal steps, and Both counts only steps with both properties.
Their costs are 2, 2 and 4; all remaining steps cost 1. Difficult includes low
objects. Fractional half-Speed budgets permit only whole movement costs.
Acrobatics/Tumble checks and other movement modes without a native Speed remain
on the action-control list; these inputs never assume a successful skill check.

Running Attack + Dodge supplies a conditional +1 Reflex against any opportunity
during the action. Mobility adds +5 only when movement provoked that attack.
The combined +6 does not count the designated-opponent Dodge bonus again.
Losing the Dexterity bonus removes both Dodge and Mobility; all are conditional
rows, never a general persistent defense increase. Printing uses the same rows.

Cleave, Great Cleave and Follow Through appear in Attacks when owned and
eligible. A resolved weapon attack records its actual attack bonus. Confirm
that it reduced the named opponent to 0 HP and that the follow-up is immediate;
the sheet does not infer enemy HP from rolled damage. Cleave requires another
opponent within reach and the identical weapon ready for a melee attack. Its
bonus is copied in full, including Charge, Full Attack, routine and target
modifiers. Its damage uses the current weapon profile; consumed Mighty Swing,
Aim and Brace benefits do not recur. No alternate bonus interpretation is added.

Cleave permits one use per round; Great Cleave removes that limit. Each new
extra attack can trigger another Cleave when it drops a new opponent. Selecting
an earlier attack permits multiple victims of an area attack to be confirmed,
while the same victim cannot be claimed twice from that attack. The effect does
not restrict the triggering attack to melee, but always requires the extra
attack to be melee with the same weapon. A ranged weapon without a reviewed
melee profile does not gain an invented melee attack.

Follow Through alone requires a melee trigger and permits movement up to the
selected native Speed once per turn. With Cleave it can supply movement before
the extra attack. Terrain costs follow the existing disjoint movement counts;
movement clears Aim and Brace. Other turn resets Follow Through and pending
triggers without clearing the character's ongoing penalties or round quota.
Next turn also expires the character's own turn-limited effects. Next round
resets Cleave and pending triggers while retaining Follow Through's current
turn use. New encounter/day and rest reset both. Reload, Withdraw, unrelated
weapon attacks and other implemented actions clear the pending immediate trigger.

Offensive Routines → Step resolves one attack at a time so immediate follow-ups
can occur between attacks. Each step preflights every remaining attack and its
ammunition before rolling. Cleave and Follow Through preserve the next step;
ordinary attacks, routine edits, Restart and turn/round transitions cancel that
execution. Swift actions and free-action reloads retain the next routine step;
Move Action reloads and Withdraw cancel it. Full Attack penalties remain until the next turn and are not charged
again on resume. A bulk Run exposes only its final attack as an immediate
trigger. Pending execution survives an ordinary reload of the website; importing
or duplicating a character clears execution and trigger snapshots, preserving
its spent counters and the stored routine definitions.

Speed → Move records an ordinary Move Action up to the selected native Speed.
The Tumble option requires trained, available Acrobatics and a DC 15 check.
Squares is the complete planned route; Tumbled is the threatened/occupied subset,
and Occupied identifies enemy-occupied squares within that subset. On success,
only the tumbled squares avoid movement-triggered attacks of opportunity and
permit passage through the declared enemy spaces. It supplies no persistent
immunity to opportunities provoked by other actions. A failed check grants no
protection and does not confirm passage through occupied enemy spaces; the
remaining route is resolved at the table rather than inferred by the sheet.

Tumble doubles the normal movement cost of its squares, including diagonal and
difficult-terrain costs. The All and Tumbled terrain columns use the same disjoint
categories as other movement controls. Untumbled movement retains its normal
cost. A tumbled category must be a subset of the matching complete-route category.
Check accepts an already resolved total; blank rolls the current Acrobatics
modifier. Entered totals are cleared after one attempt. The skill's prohibition
on Take 10/20 is retained, and natural 1/20 do not automatically fail/succeed.
Normal Move has no skill check or opportunity protection. Both actions clear
Aim/Brace and pending immediate follow-ups, interrupt routine execution, and
preserve turn-limited penalties and same-round Mighty Swing. Native/adjusted
speed and straining are checked before dice or mutation. Other feat-granted
movement has not yet been given an inferred Tumble/action-economy interaction.

Defenses → Fall Prone/Stand Up performs the actual Swift/Move Action. Acrobatics
attempts the trained DC 15 Free/Swift alternative. Only success changes position;
failure never falls back to the ordinary action automatically. Swift/Free attempts
retain routine progress; ordinary standing interrupts it. Helpless/incapacitated
actors cannot act. Hutt Supreme Stability prevents being knocked Prone; it does
not prevent voluntarily falling Prone or remove its penalties. The existing Prone
checkbox remains a manual condition control for knockdowns and outside effects.
Standing is not grid movement, so straining does not invent an extra restriction
on that action. All these attempts break Aim/Brace and pending immediate triggers.

Aim's pinned passage removes its benefit after any other Action. Second Wind,
Rage, Recover and Force-power use/recovery now clear it as well. Swift/Reaction
operations retain routine progress; standard/move/full-round Force-power use
interrupts execution. Receiving healing and automatic effect updates are not
classified as an action by the healed character.


### Cross Difficult Terrain

Speed → Move offers Cross Difficult Terrain as a trained DC 15 Acrobatics
application. Its entered total is consumed once; blank rolls with the current
skill modifier. A successful check removes the difficult-terrain surcharge.
Diagonal costs, low-object costs and Tumble costs remain. Terrain's Low objects
and Low, diagonal counts are subsets of Difficult/Both, so an obstacle is not
mistakenly waived with the difficult terrain.

Ordinary Cross Difficult Terrain and Tumble use separate DC 15 checks, per the
user's default-only ruling. Either may succeed independently. On terrain
failure, movement uses its normal cost. A route that still fits Speed can
complete at that cost. An over-budget route remains unconfirmed; the app does
not invent a destination or shorten the route. A successful Tumble check then
qualifies protection only on squares actually tumbled, rather than claiming the
entire planned path was traversed. Successful Cross Difficult Terrain alone
never prevents an attack of opportunity. All attempts clear Aim/Brace and
immediate follow-up/routine state as other Move Actions do.

Charge continues to use its separate controls and printed low-object/Cross
Difficult Terrain combined DC 35. That value is not applied to ordinary Move.
The Charge article's allowance for difficult terrain at double cost conflicts
with Acrobatics' Nimble Charge wording, which names difficult terrain alongside
low objects as requiring DC 25. Charge's action-page calculation remains the default. The approved
Ambiguities option requires trained Nimble Charge DC 25 through difficult
terrain, or DC 35 when also using Cross Difficult Terrain. Failure prevents the
attack even when the ordinary path cost fits. DC 25 alone still retains terrain
costs; Improved Charge only changes turning and does not remove the requirement.
The choice is saved per character and does not affect ordinary Move.
