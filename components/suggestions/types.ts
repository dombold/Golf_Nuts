import type { SuggestionStatusValue } from "@/lib/suggestions";

/** A suggestion as the board shows it — dates already formatted on the server. */
export interface SuggestionView {
  id: string;
  title: string;
  body: string;
  status: SuggestionStatusValue;
  doneVersion: string | null;
  authorName: string;
  date: string;
  votes: number;
  voted: boolean;
  mine: boolean;
  comments: { id: string; body: string; userName: string; date: string; mine: boolean }[];
}
