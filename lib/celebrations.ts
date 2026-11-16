import { joinNames } from "@/lib/teams";

/**
 * Birdie-or-better celebrations on the score page — pure. Uses the raw (gross) strokes against
 * par, never handicap strokes. In team games (scrambles) the team's one score counts once.
 */

export type Achievement = "HOLE_IN_ONE" | "ALBATROSS" | "EAGLE" | "BIRDIE";

export const ACHIEVEMENT_LABEL: Record<Achievement, string> = {
  HOLE_IN_ONE: "Hole in one!",
  ALBATROSS: "Albatross!",
  EAGLE: "Eagle!",
  BIRDIE: "Birdie!",
};

const RANK: Record<Achievement, number> = { HOLE_IN_ONE: 0, ALBATROSS: 1, EAGLE: 2, BIRDIE: 3 };

/** Birdie or better from raw strokes, or null. A 1 is always a hole in one. */
export function achievementFor(strokes: number, par: number): Achievement | null {
  if (!Number.isInteger(strokes) || strokes < 1) return null;
  if (strokes === 1) return "HOLE_IN_ONE";
  const diff = strokes - par;
  if (diff <= -3) return "ALBATROSS";
  if (diff === -2) return "EAGLE";
  if (diff === -1) return "BIRDIE";
  return null;
}

export interface Celebration {
  /** "Alice", or "Team 1 (Al & Bob)" in team games */
  who: string;
  achievement: Achievement;
  strokes: number;
}

/**
 * Who to celebrate for one hole's newly saved scores, best first. `saved` holds one entry per
 * player whose score was just saved; in team games entries are merged by team number.
 */
export function celebrationsForHole(
  par: number,
  teamGame: boolean,
  saved: { name: string; teamNumber: number | null; strokes: number }[]
): Celebration[] {
  const firstName = (name: string) => name.split(" ")[0];
  let scorers: { who: string; strokes: number }[];
  if (teamGame) {
    const teams = new Map<number, { names: string[]; strokes: number }>();
    for (const s of saved) {
      const t = s.teamNumber ?? 0;
      const team = teams.get(t) ?? { names: [], strokes: s.strokes };
      team.names.push(firstName(s.name));
      teams.set(t, team);
    }
    scorers = [...teams].map(([t, team]) => ({
      who: `${t ? `Team ${t}` : "Your team"} (${joinNames(team.names)})`,
      strokes: team.strokes,
    }));
  } else {
    scorers = saved.map((s) => ({ who: s.name, strokes: s.strokes }));
  }

  return scorers
    .flatMap((s) => {
      const achievement = achievementFor(s.strokes, par);
      return achievement ? [{ who: s.who, achievement, strokes: s.strokes }] : [];
    })
    .sort((a, b) => RANK[a.achievement] - RANK[b.achievement] || a.who.localeCompare(b.who));
}
