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
