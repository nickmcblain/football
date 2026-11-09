import { describe, expect, test } from "bun:test";
import {
  backendRejectsScoreFields,
  formatResult,
  normalizeResult,
  winnerFromScores,
  winnerMutationArgs,
} from "./results";

describe("match results", () => {
  test("reads the winner from the score", () => {
    expect(winnerFromScores(4, 1)).toBe("Team A");
    expect(winnerFromScores(1, 3)).toBe("Team B");
    expect(winnerFromScores(2, 2)).toBe("Draw");
  });

  test("lets a winner be saved without a score", () => {
    expect(normalizeResult({ winner: "Team A", scoreA: null, scoreB: null })).toEqual({
      winner: "Team A",
      scoreA: null,
      scoreB: null,
    });
  });

  test("uses the score when both numbers are present", () => {
    expect(normalizeResult({ winner: "Team A", scoreA: 1, scoreB: 4 })).toEqual({
      winner: "Team B",
      scoreA: 1,
      scoreB: 4,
    });
    expect(normalizeResult({ winner: "Draw", scoreA: 15, scoreB: 15 })).toEqual({
      winner: "Draw",
      scoreA: 15,
      scoreB: 15,
    });
  });

  test("rejects a single score and marks an unplayed match as unscored", () => {
    expect(() => normalizeResult({ winner: "Team A", scoreA: 2, scoreB: null })).toThrow(
      "Enter both scores",
    );
    expect(normalizeResult({ winner: "Not Played", scoreA: 2, scoreB: 2 })).toEqual({
      winner: "Not Played",
      scoreA: null,
      scoreB: null,
    });
  });

  test("sends both scores, then the winner alone when the backend rejects them", () => {
    expect(winnerMutationArgs(22, { winner: "Draw", scoreA: 15, scoreB: 15 }, true)).toEqual({
      matchId: 22,
      winner: "Draw",
      scoreA: 15,
      scoreB: 15,
    });
    expect(winnerMutationArgs(22, { winner: "Draw", scoreA: 15, scoreB: 15 }, false)).toEqual({
      matchId: 22,
      winner: "Draw",
    });
  });

  test("detects a backend that still rejects score fields", () => {
    const message =
      '[Request ID: f654c05e285b5a0c] Server Error\nArgumentValidationError: Object contains extra field `scoreA` that is not in the validator. Object: {matchId: "22.0", scoreA: 15.0, scoreB: 15.0, winner: "Draw"}\nValidator: v.object({matchId: v.float64(), winner: v.union(v.literal("Team A"), v.literal("Team B"), v.literal("Draw"), v.literal("Not Played"))})';
    expect(backendRejectsScoreFields(message)).toBe(true);
    expect(backendRejectsScoreFields("Cannot set winner without teams assigned")).toBe(false);
  });

  test("formats light and dark scores for the list", () => {
    expect(formatResult({ winner: "Team A", scoreA: 4, scoreB: 1 })).toBe("Light 4–1");
    expect(formatResult({ winner: "Draw", scoreA: null, scoreB: null })).toBe("Draw");
    expect(formatResult({ winner: "Not Played", scoreA: null, scoreB: null })).toBe("Not played");
  });
});