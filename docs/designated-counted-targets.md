# Designated targets and ally counts

This contract precedes integration. Preserve pinned source articles: Bothan
SpyNet tree revision 16345, Surveillance tree 20064, 4th-Degree Droid tree
26315, Mercenary tree 26768, and Swarm Attack 19584. Keep actual class,
species/degree and prerequisite access; complete fixtures must acquire these
through their real trees.

Knowledge is Strength gives +2 morale attack against its declared target;
Spotter gives +1 insight. Target Acquisition gives +1 circumstance attack and
damage. These conditional bonuses use the shared target resolver and typed
bonus resolver, including circumstance identity. Their preliminary action,
check, target identity, once-per-encounter limit, line of sight and expiry
remain declarations in this partial implementation. Allies resolve their own
Spotter bonus. Untargeted area attacks do not inherit the single-target bonuses.

Mercenary's Teamwork grants +2 damage per distinct ally that damaged the target
since the end of the character's last turn, capped at +10. Store a strict integer
count from 0 to 5; 5 means five or more. This stacks with Combined Mercenary
Fire's separate unnamed bonus. Use this precise time window in its control.

Swarm Attack grants one circumstance attack bonus equal to the number of
adjacent allied characters, on melee attacks only. Its count is a number input
rather than a capped rules choice. Accept integers 0 through 100000 as an input
validation bound, not a rules cap. Share target count validation, source loss,
actual attack/routine bonuses and persistence. Declared positions and counts
remain manual. All five entries stay Partial.
