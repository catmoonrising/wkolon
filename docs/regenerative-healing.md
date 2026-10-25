# Regenerative Healing contract

Pinned Regenerative Healing revision 20752 (Rebellion Era Campaign Guide) lets a
Trandoshan replace the immediate HP from catching a Second Wind with 5 HP at the
end of each of their turns, once per day, until full HP or encounter end. The
source remains verbatim. This contract precedes calculations.

The closed feat effect is `{target:'regenerativeHealing', amount:5, dailyUses:1}`.
The alternative uses normal Second Wind eligibility, action cost, daily and
encounter uses, exhaustion and Condition Track benefits. It replaces all of the
immediate HP, including Force Recovery; it does not roll unused healing dice.
The feat's daily use is spent on activation and cannot refresh during an
encounter. Ordinary Second Wind remains selectable.

Three optional recovery booleans (`regenerationUsed`, `regenerationActive`,
`regenerationEnded`) retain the daily use, active healing and duplicate-end guard.
They default false for old characters. Activation readies this turn's end. End
Turn, Charge and the implicit end before New Turn each pulse through one shared
helper, once. New Turn readies the next end. Preview affects only a clone and
must spend both uses so a second queued activation is unavailable.

Each pulse uses ordinary `receiveHealing`, including the saved unconscious-HP
interpretation, consciousness recovery, maximum HP and existing persistent
conditions. Helplessness alone does not end the effect. Death, encounter end,
new encounter, rest or a new day end it; only New Day restores its daily use.
Healing to full by another source also ends it immediately. Source loss ends
the effect. The sheet's existing change normalization handles manual HP edits
and build changes so healing cannot resume after an intervening full-HP state.

HP offers the feat as a separate Second Wind alternative, with an active-only
5 HP/turn indicator. The Actions Second Wind form offers the same choice and
cost; queued actions do not spend or roll until executed. Persist, import and
reload retain activity, daily use and duplicate-end protection. No automatic
game-time passage or other actor's healing is inferred.
