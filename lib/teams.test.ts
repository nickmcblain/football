import { describe, expect, test } from "bun:test";
import type { Match } from "./types";
import { assignByPosition, balanceTeamsByWinRate, seasonWinRates } from "./teams";

function match(
  id: number,
  teamA: number[],
  teamB: number[],
  winner: Match["winner"],
  seasonId = 1,
): Match {
  return {
    id,
    seasonId,
    date: `2026-01-${String(id).padStart(2, "0")}`,
    time: "20:00",
    price: 70,
    location: "",
    pitch: "",
    teamA,
    teamB,
    winner,
  };
}

const steady = () => 0;

describe("season win rates", () => {
  test("uses completed matches from the provided season and counts newcomers as even", () => {
    const rates = seasonWinRates(
      [1, 2, 3],
      [
        match(1, [1], [2], "Team A"),
        match(2, [1], [2], "Team A"),
        match(3, [1], [2], "Draw"),
        match(4, [2], [1], "Team A"),
        match(5, [1], [2], "Not Played"),
        match(9, [1], [2], "Team B"),
      ],
      9,
    );

    expect(rates.find((player) => player.id === 1)).toMatchObject({
      matchesPlayed: 4,
      winRate: 50,
    });
    expect(rates.find((player) => player.id === 2)).toMatchObject({
      matchesPlayed: 4,
      winRate: 25,
    });
    expect(rates.find((player) => player.id === 3)).toMatchObject({
      matchesPlayed: 0,
      winRate: 50,
    });
  });
});

describe("balance teams by win rate", () => {
  test("pairs high and low win rates, even when that leaves positions uneven", () => {
    const players = [
      { id: 1, winRate: 100, matchesPlayed: 8 },
      { id: 2, winRate: 80, matchesPlayed: 8 },
      { id: 3, winRate: 20, matchesPlayed: 8 },
      { id: 4, winRate: 0, matchesPlayed: 8 },
    ];

    const { teamA, teamB } = balanceTeamsByWinRate(players, [], [], steady);
    const sides = [teamA, teamB]
      .map((ids) => ids.slice().sort((a, b) => a - b))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    expect(sides).toEqual([
      [1, 4],
      [2, 3],
    ]);
    expect(teamA.length).toBe(teamB.length);
  });

  test("keeps manually placed players and fills around their form", () => {
    const players = [
      { id: 1, winRate: 90, matchesPlayed: 6 },
      { id: 2, winRate: 80, matchesPlayed: 6 },
      { id: 3, winRate: 30, matchesPlayed: 6 },
      { id: 4, winRate: 20, matchesPlayed: 6 },
    ];

    const { teamA, teamB } = balanceTeamsByWinRate(players, [1], [], steady);

    expect(teamA).toContain(1);
    expect(teamB).not.toContain(1);
    expect(teamA.slice().sort((a, b) => a - b)).toEqual([1, 4]);
    expect(teamB.slice().sort((a, b) => a - b)).toEqual([2, 3]);
  });

  test("stays close across reshuffles and can change who plays with whom", () => {
    const players = [70, 66, 62, 58, 54, 46, 42, 38, 34, 30].map((winRate, index) => ({
      id: index + 1,
      winRate,
      matchesPlayed: 5,
    }));
    const rate = new Map(players.map((player) => [player.id, player.winRate]));
    const average = (ids: number[]) =>
      ids.reduce((sum, id) => sum + (rate.get(id) ?? 0), 0) / ids.length;

    const splits = new Set<string>();
    for (let seed = 1; seed <= 12; seed += 1) {
      let state = seed;
      const random = () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
      const { teamA, teamB } = balanceTeamsByWinRate(players, [], [], random);
      expect(Math.abs(teamA.length - teamB.length)).toBeLessThanOrEqual(1);
      expect(Math.abs(average(teamA) - average(teamB))).toBeLessThanOrEqual(12);
      splits.add([...teamA].sort((a, b) => a - b).join(","));
    }

    expect(splits.size).toBeGreaterThan(1);
  });
});

describe("position randomize", () => {
  test("alternates players within each position", () => {
    const players = [
      { id: 1, position: "Defense" as const },
      { id: 2, position: "Defense" as const },
      { id: 3, position: "Midfield" as const },
      { id: 4, position: "Midfield" as const },
      { id: 5, position: "Attack" as const },
    ];

    const { teamA, teamB } = assignByPosition(players, [], [], () => 0.999);

    expect(teamA).toEqual([1, 3, 5]);
    expect(teamB).toEqual([2, 4]);
  });
});
