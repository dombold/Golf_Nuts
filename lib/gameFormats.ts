import { z } from "zod";
import type { GameFormat } from "@/app/generated/prisma/enums";

/** Every game format, in picker order. Kept in step with the Prisma `GameFormat` enum. */
export const GAME_FORMATS = [
  { value: "STROKEPLAY", label: "Strokeplay", desc: "Total gross / net strokes" },
  { value: "STABLEFORD", label: "Stableford", desc: "Points per hole" },
  { value: "MATCH_PLAY", label: "Match Play", desc: "Hole-by-hole win/loss (2 players)" },
  { value: "SKINS", label: "Skins", desc: "Win each hole outright" },
  { value: "AMBROSE_2", label: "2-Player Ambrose", desc: "Best ball scramble (pairs)" },
  { value: "AMBROSE_4", label: "4-Player Ambrose", desc: "Best ball scramble (teams of 4)" },
] as const satisfies readonly { value: GameFormat; label: string; desc: string }[];

/** Match Play is a single head-to-head, so it can't decide a multi-group event. */
export const EVENT_FORMATS = GAME_FORMATS.filter((f) => f.value !== "MATCH_PLAY");

const values = GAME_FORMATS.map((f) => f.value);
export const GameFormatSchema = z.enum(values as [GameFormat, ...GameFormat[]]);
export const EventFormatSchema = GameFormatSchema.exclude(["MATCH_PLAY"]);

export function formatLabel(format: string): string {
  return GAME_FORMATS.find((f) => f.value === format)?.label ?? format;
}

/** The two Ambrose sizes, offered as a sub-choice once "Ambrose" is picked. */
export const AMBROSE_VARIANTS = [
  { value: "AMBROSE_2", label: "2-ball", desc: "Teams of 2" },
  { value: "AMBROSE_4", label: "4-ball", desc: "Teams of 4 (or 3)" },
] as const satisfies readonly { value: GameFormat; label: string; desc: string }[];

export function isAmbroseFormat(format: string): boolean {
  return format === "AMBROSE_2" || format === "AMBROSE_4";
}

/** Stableford can be played individually or as scramble teams of 2 or 4. */
export const STABLEFORD_TEAM_SIZES = [
  { value: 1, label: "Individual", desc: "Everyone for themselves" },
  { value: 2, label: "Teams of 2", desc: "Pairs, one ball" },
  { value: 4, label: "Teams of 4", desc: "Fours (or 3), one ball" },
] as const;

export type TeamSize = 1 | 2 | 4;

/** Players per team for a game: Ambrose by format, Stableford by its team setting, otherwise 1. */
export function teamSizeFor(format: string, stablefordTeamSize: number = 1): TeamSize {
  if (format === "AMBROSE_2") return 2;
  if (format === "AMBROSE_4") return 4;
  if (format === "STABLEFORD" && (stablefordTeamSize === 2 || stablefordTeamSize === 4)) return stablefordTeamSize;
  return 1;
}

/** Team games play one ball per team (scramble) with a team handicap. */
export function isTeamGame(format: string, stablefordTeamSize: number = 1): boolean {
  return teamSizeFor(format, stablefordTeamSize) > 1;
}

/** e.g. "Stableford — teams of 2"; other formats use their normal label. */
export function formatDisplayLabel(format: string, stablefordTeamSize: number = 1): string {
  if (format === "STABLEFORD" && isTeamGame(format, stablefordTeamSize)) {
    return `Stableford — teams of ${stablefordTeamSize}`;
  }
  return formatLabel(format);
}
