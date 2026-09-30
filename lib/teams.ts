/** "Alice & Bob", "Alice, Bob & Carol" */
export function joinNames(names: string[]): string {
  return names.length <= 2 ? names.join(" & ") : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/**
 * Team helpers for team games (Ambrose, team Stableford) — pure, shared by the event group builder,
 * the New Round Teams step, randomise, /start and format changes.
 */

/**
 * Split players into teams of `teamSize`, balancing handicaps: the number of teams is
 * ceil(players / teamSize); players are sorted by handicap and snake-drafted (1,2,…,k,k,…,1).
 * Pairs: 4 → {1st,4th}{2nd,3rd}. Nine in fours → 3/3/3. A group of ≤4 at size 4 is one team.
 * Returns each player's team number (1…k).
 */
export function splitIntoTeams(members: { userId: string; handicap: number }[], teamSize: number): Map<string, number> {
  const sorted = [...members].sort((a, b) => a.handicap - b.handicap);
  const teamCount = Math.max(1, Math.ceil(sorted.length / Math.max(1, teamSize)));
  const teams = new Map<string, number>();
  sorted.forEach((m, i) => {
    const round = Math.floor(i / teamCount);
    const pos = i % teamCount;
    teams.set(m.userId, round % 2 === 0 ? pos + 1 : teamCount - pos);
  });
  return teams;
}

interface WarningGroup {
  /** Omitted for a casual round (a single group) */
  groupNumber?: number;
  members: { userId: string; teamNumber?: number | null }[];
}

/** Short or uneven teams, as readable warnings (empty when every team is full). */
export function teamWarnings(teamSize: number, groups: WarningGroup[]): string[] {
  if (teamSize < 2) return [];
  const warnings: string[] = [];
  for (const g of groups) {
    if (g.members.length === 0) continue;
    const prefix = g.groupNumber !== undefined ? `Group ${g.groupNumber}` : "";

    const bySize = new Map<number, number>();
    for (const m of g.members) {
      const t = m.teamNumber ?? 0;
      bySize.set(t, (bySize.get(t) ?? 0) + 1);
    }
    const teams = [...bySize].sort((a, b) => a[0] - b[0]);

    for (const [team, count] of teams) {
      if (count === teamSize) continue;
      const plural = `${count} player${count !== 1 ? "s" : ""}`;
      if (teamSize === 4 && teams.length === 1 && prefix) {
        // Events: a group of fewer than 4 is simply one smaller team
        if (count < 4) warnings.push(`${prefix} has ${plural} — they play as a team of ${count}.`);
        continue;
      }
      const label = team ? `Team ${team}` : "Players without a team";
      const who = prefix ? `${prefix}: ${label}` : label;
      warnings.push(count < teamSize ? `${who} has ${plural} — a team of ${count}.` : `${who} has ${plural}.`);
    }
  }
  return warnings;
}

/**
 * A hint when the players can't be split evenly for the game, or null.
 * `gameLabel` e.g. "2-player Ambrose" / "Stableford teams of 2"; `largerAlternative` is what to suggest
 * for pairs (e.g. "4-player Ambrose"); `context` tailors where to change it.
 */
export function oddNumberHint(
  gameLabel: string,
  teamSize: number,
  playerCount: number,
  { largerAlternative, context = "event" }: { largerAlternative?: string; context?: "event" | "round" } = {}
): string | null {
  const who = context === "event" ? "players accepted" : "players";
  if (teamSize === 2 && playerCount % 2 === 1) {
    const suggestion = context === "event" && largerAlternative
      ? ` Consider ${largerAlternative} in groups of 3 (Edit event details).`
      : "";
    return `${playerCount} ${who} — with ${gameLabel} one team will be short.${suggestion}`;
  }
  if (teamSize === 4 && playerCount % 4 !== 0 && playerCount > 4) {
    return `${playerCount} ${who} — some teams will have fewer than 4. ` +
      `Teams of 3 play as teams of 3, with the team handicap adjusted to suit.`;
  }
  return null;
}

/** Label and "bigger teams" suggestion for a team game, for warnings and hints. */
export function teamGameLabels(format: string, teamSize: number): { gameLabel: string; largerAlternative?: string } {
  if (format === "AMBROSE_2" || format === "AMBROSE_4") {
    return { gameLabel: `${teamSize}-player Ambrose`, largerAlternative: teamSize === 2 ? "4-player Ambrose" : undefined };
  }
  return { gameLabel: `Stableford teams of ${teamSize}`, largerAlternative: teamSize === 2 ? "Stableford teams of 4" : undefined };
}
