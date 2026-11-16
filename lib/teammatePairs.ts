import { isTeamGame } from "@/lib/gameFormats";
import { teamsInGroup } from "@/lib/teams";

export interface PairRound {
  format: string;
  stablefordTeamSize: number;
  date: Date;
  players: { userId: string; teamNumber: number | null }[];
}

export interface TeammatePair {
  /** The two players' ids, in sorted order */
  aId: string;
  bId: string;
  /** Number of event rounds they were on the same team */
  count: number;
  lastPlayed: Date;
}

/**
 * How often each pair of players has been on the same team. Teams are worked out the same way
 * as the standings: only in team games, by team number within each group's round (no number →
 * one team). Individual formats contribute nothing. Pure — the admin page passes in event rounds.
 */
export function countTeammatePairs(rounds: PairRound[]): TeammatePair[] {
  const pairs = new Map<string, TeammatePair>();
  for (const round of rounds) {
    if (!isTeamGame(round.format, round.stablefordTeamSize)) continue;
    for (const [, members] of teamsInGroup(round.players)) {
      const ids = [...new Set(members.map((m) => m.userId))].sort();
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${ids[i]}|${ids[j]}`;
          const existing = pairs.get(key);
          if (existing) {
            existing.count++;
            if (round.date > existing.lastPlayed) existing.lastPlayed = round.date;
          } else {
            pairs.set(key, { aId: ids[i], bId: ids[j], count: 1, lastPlayed: round.date });
          }
        }
      }
    }
  }
  return [...pairs.values()];
}
