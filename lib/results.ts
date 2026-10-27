import type { Winner } from "./types";

export interface MatchResultInput {
  winner: Winner;
  scoreA: number | null;
  scoreB: number | null;
}

export function winnerFromScores(scoreA: number, scoreB: number): Exclude<Winner, "Not Played"> {
  if (scoreA > scoreB) return "Team A";
  if (scoreB > scoreA) return "Team B";
  return "Draw";
}

export function normalizeResult(input: MatchResultInput): MatchResultInput {
  if (input.winner === "Not Played") {
    return { winner: "Not Played", scoreA: null, scoreB: null };
  }

  const { scoreA, scoreB } = input;
  if ((scoreA === null) !== (scoreB === null)) {
    throw new Error("Enter both scores, or leave both empty");
  }

  if (scoreA !== null && scoreB !== null) {
    if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
      throw new Error("Scores must be whole numbers of 0 or more");
    }
    return { winner: winnerFromScores(scoreA, scoreB), scoreA, scoreB };
  }

  return { winner: input.winner, scoreA: null, scoreB: null };
}

export function formatResult(match: MatchResultInput): string {
  if (match.winner === "Not Played") return "Not played";
  const side = match.winner === "Team A" ? "Light" : match.winner === "Team B" ? "Dark" : "Draw";
  const scoreA = match.scoreA ?? null;
  const scoreB = match.scoreB ?? null;
  if (scoreA !== null && scoreB !== null) {
    return `${side} ${scoreA}–${scoreB}`;
  }
  return side;
}
