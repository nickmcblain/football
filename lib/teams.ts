import { calculateLeaderboard } from "./statistics";
import type { Match, Position } from "./types";

const WIN_RATE_JITTER = 4;
const NEUTRAL_WIN_RATE = 50;
const MAX_COMBINATIONS = 20000;

type RatedPlayer = {
  id: number;
  winRate: number;
  matchesPlayed: number;
};

export interface BalancedTeams {
  teamA: number[];
  teamB: number[];
  teamAWinRate: number;
  teamBWinRate: number;
  players: RatedPlayer[];
}

type StatsMatch = Pick<Match, "date" | "id" | "seasonId" | "teamA" | "teamB" | "winner">;

export function seasonWinRates(
  playerIds: number[],
  matches: StatsMatch[],
  excludeMatchId?: number,
): RatedPlayer[] {
  const relevant =
    excludeMatchId === undefined
      ? matches
      : matches.filter((match) => match.id !== excludeMatchId);
  const leaderboard = calculateLeaderboard(
    playerIds.map((id) => ({ id, name: String(id) })),
    relevant,
    true,
  );
  const byId = new Map(leaderboard.map((entry) => [entry.playerId, entry]));

  return playerIds.map((id) => {
    const entry = byId.get(id);
    const matchesPlayed = entry?.matchesPlayed ?? 0;
    return {
      id,
      matchesPlayed,
      winRate: matchesPlayed === 0 ? NEUTRAL_WIN_RATE : (entry?.winRate ?? NEUTRAL_WIN_RATE),
    };
  });
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function assignByPosition(
  players: { id: number; position: Position }[],
  lockedTeamA: number[] = [],
  lockedTeamB: number[] = [],
  random: () => number = Math.random,
): { teamA: number[]; teamB: number[] } {
  const locked = new Set([...lockedTeamA, ...lockedTeamB]);
  const byPosition: Record<Position, { id: number; position: Position }[]> = {
    Attack: [],
    Midfield: [],
    Defense: [],
  };

  for (const player of players) {
    if (locked.has(player.id)) continue;
    byPosition[player.position].push(player);
  }

  for (const position of Object.keys(byPosition) as Position[]) {
    byPosition[position] = shuffle(byPosition[position], random);
  }

  const teamA = [...lockedTeamA];
  const teamB = [...lockedTeamB];

  for (const position of ["Defense", "Midfield", "Attack"] as Position[]) {
    for (const player of byPosition[position]) {
      if (teamA.length <= teamB.length) teamA.push(player.id);
      else teamB.push(player.id);
    }
  }

  return { teamA, teamB };
}

function usedRate(player: RatedPlayer | undefined): number {
  if (!player || player.matchesPlayed === 0) return NEUTRAL_WIN_RATE;
  return player.winRate;
}

function average(ids: number[], rateOf: (id: number) => number): number {
  if (ids.length === 0) return 0;
  return ids.reduce((sum, id) => sum + rateOf(id), 0) / ids.length;
}

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

function combinationCount(total: number, count: number): number {
  if (count < 0 || count > total) return 0;
  const choose = Math.min(count, total - count);
  let product = 1;
  for (let i = 1; i <= choose; i += 1) {
    product = (product * (total - choose + i)) / i;
    if (product > MAX_COMBINATIONS) return product;
  }
  return product;
}

function eachChoice(items: number[], count: number, random: () => number, visit: (chosen: number[]) => void) {
  if (combinationCount(items.length, count) <= MAX_COMBINATIONS) {
    const current: number[] = [];
    const walk = (start: number) => {
      if (current.length === count) {
        visit([...current]);
        return;
      }
      const remaining = count - current.length;
      for (let index = start; index <= items.length - remaining; index += 1) {
        current.push(items[index]);
        walk(index + 1);
        current.pop();
      }
    };
    if (count >= 0 && count <= items.length) walk(0);
    return;
  }

  const seen = new Set<string>();
  for (let attempt = 0; attempt < MAX_COMBINATIONS; attempt += 1) {
    const chosen = shuffle(items, random)
      .slice(0, count)
      .sort((a, b) => a - b);
    const key = chosen.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    visit(chosen);
  }
}

export function balanceTeamsByWinRate(
  players: RatedPlayer[],
  lockedTeamA: number[] = [],
  lockedTeamB: number[] = [],
  random: () => number = Math.random,
): BalancedTeams {
  const byId = new Map<number, RatedPlayer>();
  for (const player of players) byId.set(player.id, player);

  const rateOf = (id: number) => usedRate(byId.get(id));
  const lockedA = [...new Set(lockedTeamA)];
  const lockedB = [...new Set(lockedTeamB)].filter((id) => !lockedA.includes(id));
  const locked = new Set([...lockedA, ...lockedB]);
  const free = players
    .map((player) => player.id)
    .filter((id, index, ids) => !locked.has(id) && ids.indexOf(id) === index);
  const everyone = [...new Set([...free, ...lockedA, ...lockedB])];
  const total = everyone.length;

  let targetA = Math.floor(total / 2);
  let targetB = total - targetA;
  if (total % 2 === 1) {
    const giveExtraToA =
      lockedA.length === lockedB.length
        ? random() < 0.5
        : lockedA.length < lockedB.length;
    if (giveExtraToA) {
      targetA += 1;
      targetB -= 1;
    }
  }
  if (lockedA.length > targetA) {
    targetA = lockedA.length;
    targetB = Math.max(lockedB.length, total - targetA);
  }
  if (lockedB.length > targetB) {
    targetB = lockedB.length;
    targetA = Math.max(lockedA.length, total - targetB);
  }

  const needA = Math.min(free.length, Math.max(0, targetA - lockedA.length));
  const noisy = new Map(everyone.map((id) => [id, rateOf(id) + (random() - 0.5) * 2 * WIN_RATE_JITTER]));
  const noisyRate = (id: number) => noisy.get(id) ?? rateOf(id);
  const state: { best: { teamA: number[]; teamB: number[]; gap: number } | null } = { best: null };

  eachChoice(free, needA, random, (chosen) => {
    const chosenSet = new Set(chosen);
    const teamA = [...lockedA, ...chosen];
    const teamB = [...lockedB, ...free.filter((id) => !chosenSet.has(id))];
    const gap = Math.abs(average(teamA, noisyRate) - average(teamB, noisyRate));
    const best = state.best;
    if (!best || gap < best.gap || (gap === best.gap && random() < 0.5)) {
      state.best = { teamA, teamB, gap };
    }
  });

  const teamA = state.best?.teamA ?? [...lockedA];
  const teamB = state.best?.teamB ?? [...lockedB, ...free];

  return {
    teamA,
    teamB,
    teamAWinRate: roundRate(average(teamA, rateOf)),
    teamBWinRate: roundRate(average(teamB, rateOf)),
    players: everyone.map((id) => ({
      id,
      matchesPlayed: byId.get(id)?.matchesPlayed ?? 0,
      winRate: rateOf(id),
    })),
  };
}
