import { describe, expect, test } from "bun:test";
import { formatResult, normalizeResult, winnerFromScores } from "./results";

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

  test("formats light and dark scores for the list", () => {
    expect(formatResult({ winner: "Team A", scoreA: 4, scoreB: 1 })).toBe("Light 4–1");
    expect(formatResult({ winner: "Draw", scoreA: null, scoreB: null })).toBe("Draw");
    expect(formatResult({ winner: "Not Played", scoreA: null, scoreB: null })).toBe("Not played");
  });
});