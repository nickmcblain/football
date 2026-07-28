import { describe, expect, test } from "bun:test";
import { buildSeasonRoundup, calculateDuos, calculateLeaderboard } from "./statistics";
import type { Match } from "./types";

const players = [
  { id: 1, name: "Alex" },
  { id: 2, name: "Blair" },
  { id: 3, name: "Casey" },
  { id: 4, name: "Drew" },
  { id: 5, name: "Unused" },
];

function match(
  id: number,
  date: string,
  teamA: number[],
  teamB: number[],
  winner: Match["winner"],
): Match {
  return {
    id,
    seasonId: 1,
    date,
    time: "20:00",
    price: 70,
    location: "",
    pitch: "",
    teamA,
    teamB,
    winner,
  };
}

const matches = [
  match(1, "2026-01-01", [1, 2], [3, 4], "Team A"),
  match(2, "2026-01-08", [1, 2], [3, 4], "Team A"),
  match(3, "2026-01-15", [1, 3], [2, 4], "Team B"),
  match(4, "2026-01-22", [1, 2], [3, 4], "Draw"),
  match(5, "2026-01-29", [5], [1], "Not Played"),
];

describe("season statistics", () => {
  test("derives points, form, rates, and excludes unfinished fixtures", () => {
    const leaderboard = calculateLeaderboard(players, matches, false);

    expect(leaderboard).toHaveLength(4);
    expect(leaderboard[0]).toMatchObject({
      name: "Blair",
      points: 11,
      matchesPlayed: 4,
      wins: 3,
      draws: 1,
      losses: 0,
      winRate: 75,
      form: ["W", "W", "W", "D"],
    });
    expect(leaderboard.some((entry) => entry.name === "Unused")).toBe(false);
  });

  test("keeps zero-appearance players in all-time mode", () => {
    const leaderboard = calculateLeaderboard(players, matches, true);
    expect(leaderboard.at(-1)).toMatchObject({
      name: "Unused",
      matchesPlayed: 0,
      points: 0,
    });
  });

  test("aggregates same-team duos with a three-match threshold", () => {
    const duos = calculateDuos(players, matches);
    expect(duos.find((duo) => duo.playerIds.join(":") === "1:2")).toMatchObject({
      matchesPlayed: 3,
      wins: 2,
      draws: 1,
      losses: 0,
      winRate: 67,
    });
    expect(duos.find((duo) => duo.playerIds.join(":") === "3:4")).toMatchObject({
      matchesPlayed: 3,
      wins: 0,
      draws: 1,
      losses: 2,
      winRate: 0,
    });
  });

  test("builds club awards, shirt split, tied attendance, and personal stories", () => {
    const roundup = buildSeasonRoundup(
      {
        id: 1,
        name: "2025/26",
        slug: "2025-26",
        startDate: "2025-11-24",
        endDate: "2026-07-27",
        closedAt: 123,
      },
      players,
      matches,
      456,
    );

    expect(roundup.totals).toEqual({
      matchesPlayed: 4,
      uniquePlayers: 4,
      totalAppearances: 16,
    });
    expect(roundup.teamSplit).toEqual({
      lightWins: 2,
      darkWins: 1,
      draws: 1,
      lightWinPercentage: 50,
      darkWinPercentage: 25,
      drawPercentage: 25,
    });
    expect(roundup.bestWinRate).toEqual([{ playerId: 2, name: "Blair", value: 75 }]);
    expect(roundup.worstWinRate).toEqual([{ playerId: 3, name: "Casey", value: 0 }]);
    expect(roundup.mostAppearances).toHaveLength(4);
    expect(roundup.bestDuos[0].playerIds).toEqual([1, 2]);
    expect(roundup.worstDuos[0].playerIds).toEqual([3, 4]);
    expect(roundup.players.find((player) => player.playerId === 2)).toMatchObject({
      leaderboardRank: 1,
      attendanceRank: 2,
      light: { appearances: 3, wins: 2, draws: 1, losses: 0, winRate: 67 },
      dark: { appearances: 1, wins: 1, draws: 0, losses: 0, winRate: 100 },
    });
  });
});
