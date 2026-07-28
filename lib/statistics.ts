import type {
  DuoStats,
  FormResult,
  LeaderboardEntry,
  Match,
  PersonalRoundup,
  Player,
  PlayerAward,
  Season,
  SeasonRoundup,
  TeamRecord,
} from "./types";

type StatsPlayer = Pick<Player, "id" | "name">;
type StatsMatch = Pick<Match, "date" | "id" | "seasonId" | "teamA" | "teamB" | "winner">;

const PLAYER_AWARD_MINIMUM = 3;
const DUO_AWARD_MINIMUM = 3;

function roundPercentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function resultForPlayer(match: StatsMatch, playerId: number): FormResult {
  if (match.winner === "Draw") return "D";
  const isTeamA = match.teamA.includes(playerId);
  return (match.winner === "Team A" && isTeamA) ||
    (match.winner === "Team B" && !isTeamA)
    ? "W"
    : "L";
}

function pointsForResult(result: FormResult) {
  if (result === "W") return 3;
  if (result === "D") return 2;
  return 1;
}

function completedMatches(matches: StatsMatch[]) {
  return matches
    .filter((match) => match.winner !== "Not Played")
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      return byDate !== 0 ? byDate : b.id - a.id;
    });
}

export function calculateLeaderboard(
  players: StatsPlayer[],
  matches: StatsMatch[],
  includePlayersWithoutAppearances: boolean,
): LeaderboardEntry[] {
  const playedMatches = completedMatches(matches);

  const entries = players.flatMap((player) => {
    const playerMatches = playedMatches.filter(
      (match) => match.teamA.includes(player.id) || match.teamB.includes(player.id),
    );
    if (!includePlayersWithoutAppearances && playerMatches.length === 0) return [];

    const results = playerMatches.map((match) => resultForPlayer(match, player.id));
    const wins = results.filter((result) => result === "W").length;
    const draws = results.filter((result) => result === "D").length;
    const losses = results.filter((result) => result === "L").length;
    const points = results.reduce((sum, result) => sum + pointsForResult(result), 0);
    const matchesPlayed = playerMatches.length;

    return [{
      rank: 0,
      playerId: player.id,
      name: player.name,
      points,
      matchesPlayed,
      avgPointsPerMatch:
        matchesPlayed === 0 ? 0 : Math.round((points / matchesPlayed) * 10) / 10,
      lastPlayedDate: playerMatches[0]?.date ?? null,
      winRate: roundPercentage(wins, matchesPlayed),
      wins,
      draws,
      losses,
      form: results.slice(0, 5).reverse(),
    }];
  });

  return entries
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function awardsAtExtreme(
  leaderboard: LeaderboardEntry[],
  key: "points" | "matchesPlayed" | "winRate",
  direction: "best" | "worst",
  minimumAppearances = 0,
): PlayerAward[] {
  const eligible = leaderboard.filter((entry) => entry.matchesPlayed >= minimumAppearances);
  if (eligible.length === 0) return [];
  const values = eligible.map((entry) => entry[key]);
  const extreme = direction === "best" ? Math.max(...values) : Math.min(...values);
  return eligible
    .filter((entry) => entry[key] === extreme)
    .map((entry) => ({ playerId: entry.playerId, name: entry.name, value: extreme }));
}

function buildTeamRecord(
  matches: StatsMatch[],
  playerId: number,
  team: "light" | "dark",
): TeamRecord {
  const teamMatches = completedMatches(matches).filter((match) =>
    team === "light" ? match.teamA.includes(playerId) : match.teamB.includes(playerId),
  );
  const results = teamMatches.map((match) => resultForPlayer(match, playerId));
  const wins = results.filter((result) => result === "W").length;
  const draws = results.filter((result) => result === "D").length;
  const losses = results.filter((result) => result === "L").length;
  return {
    appearances: teamMatches.length,
    wins,
    draws,
    losses,
    winRate: roundPercentage(wins, teamMatches.length),
  };
}

export function calculateDuos(players: StatsPlayer[], matches: StatsMatch[]): DuoStats[] {
  const playerNames = new Map(players.map((player) => [player.id, player.name]));
  const pairResults = new Map<string, FormResult[]>();

  for (const match of completedMatches(matches)) {
    for (const team of [match.teamA, match.teamB]) {
      const sorted = [...team].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i += 1) {
        for (let j = i + 1; j < sorted.length; j += 1) {
          const pair: [number, number] = [sorted[i], sorted[j]];
          const key = pair.join(":");
          const result = resultForPlayer(match, pair[0]);
          pairResults.set(key, [...(pairResults.get(key) ?? []), result]);
        }
      }
    }
  }

  return [...pairResults.entries()].map(([key, results]) => {
    const [first, second] = key.split(":").map(Number) as [number, number];
    const wins = results.filter((result) => result === "W").length;
    const draws = results.filter((result) => result === "D").length;
    const losses = results.filter((result) => result === "L").length;
    return {
      playerIds: [first, second],
      names: [playerNames.get(first) ?? `Player ${first}`, playerNames.get(second) ?? `Player ${second}`],
      matchesPlayed: results.length,
      wins,
      draws,
      losses,
      winRate: roundPercentage(wins, results.length),
    };
  });
}

function duosAtExtreme(duos: DuoStats[], direction: "best" | "worst") {
  const eligible = duos.filter((duo) => duo.matchesPlayed >= DUO_AWARD_MINIMUM);
  if (eligible.length === 0) return [];
  const values = eligible.map((duo) => duo.winRate);
  const extreme = direction === "best" ? Math.max(...values) : Math.min(...values);
  return eligible
    .filter((duo) => duo.winRate === extreme)
    .sort((a, b) => b.matchesPlayed - a.matchesPlayed || a.names.join("").localeCompare(b.names.join("")));
}

function personalPartners(duos: DuoStats[], playerId: number, direction: "best" | "worst") {
  return duosAtExtreme(
    duos.filter(
      (duo) => duo.playerIds.includes(playerId) && duo.matchesPlayed >= DUO_AWARD_MINIMUM,
    ),
    direction,
  );
}

export function buildSeasonRoundup(
  season: Pick<Season, "id" | "name" | "slug" | "startDate" | "endDate" | "closedAt">,
  players: StatsPlayer[],
  matches: StatsMatch[],
  generatedAt: number,
): SeasonRoundup {
  const playedMatches = completedMatches(matches);
  const leaderboard = calculateLeaderboard(players, playedMatches, false);
  const duos = calculateDuos(players, playedMatches);
  const totalAppearances = playedMatches.reduce(
    (sum, match) => sum + match.teamA.length + match.teamB.length,
    0,
  );
  const lightWins = playedMatches.filter((match) => match.winner === "Team A").length;
  const darkWins = playedMatches.filter((match) => match.winner === "Team B").length;
  const draws = playedMatches.filter((match) => match.winner === "Draw").length;

  const attendanceOrder = [...leaderboard].sort(
    (a, b) => b.matchesPlayed - a.matchesPlayed || a.name.localeCompare(b.name),
  );
  const attendanceRanks = new Map(
    attendanceOrder.map((entry, index) => [entry.playerId, index + 1]),
  );

  const personalRoundups: PersonalRoundup[] = leaderboard.map((entry) => ({
    playerId: entry.playerId,
    name: entry.name,
    appearances: entry.matchesPlayed,
    attendanceRank: attendanceRanks.get(entry.playerId) ?? 0,
    points: entry.points,
    leaderboardRank: entry.rank,
    avgPointsPerMatch: entry.avgPointsPerMatch,
    wins: entry.wins,
    draws: entry.draws,
    losses: entry.losses,
    winRate: entry.winRate,
    form: entry.form,
    light: buildTeamRecord(playedMatches, entry.playerId, "light"),
    dark: buildTeamRecord(playedMatches, entry.playerId, "dark"),
    bestPartners: personalPartners(duos, entry.playerId, "best"),
    worstPartners: personalPartners(duos, entry.playerId, "worst"),
  }));

  return {
    season,
    generatedAt,
    totals: {
      matchesPlayed: playedMatches.length,
      uniquePlayers: leaderboard.length,
      totalAppearances,
    },
    leaderboard,
    champions: awardsAtExtreme(leaderboard, "points", "best"),
    podium: leaderboard.slice(0, 3),
    mostAppearances: awardsAtExtreme(leaderboard, "matchesPlayed", "best"),
    teamSplit: {
      lightWins,
      darkWins,
      draws,
      lightWinPercentage: roundPercentage(lightWins, playedMatches.length),
      darkWinPercentage: roundPercentage(darkWins, playedMatches.length),
      drawPercentage: roundPercentage(draws, playedMatches.length),
    },
    bestWinRate: awardsAtExtreme(
      leaderboard,
      "winRate",
      "best",
      PLAYER_AWARD_MINIMUM,
    ),
    worstWinRate: awardsAtExtreme(
      leaderboard,
      "winRate",
      "worst",
      PLAYER_AWARD_MINIMUM,
    ),
    bestDuos: duosAtExtreme(duos, "best"),
    worstDuos: duosAtExtreme(duos, "worst"),
    players: personalRoundups,
  };
}

