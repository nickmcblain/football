/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type {
  Player,
  Match,
  Payment,
  CreatePlayerInput,
  UpdatePlayerInput,
  CreateMatchInput,
  UpdateMatchInput,
  AssignTeamsInput,
  Winner,
  LeaderboardEntry,
  PaymentMatrix,
  Position,
} from "./types";

const api = anyApi as any;

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!url) {
    throw new Error(
      "Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL) in your environment."
    );
  }
  return url;
}

function createClient(): ConvexHttpClient {
  return new ConvexHttpClient(getConvexUrl());
}

export async function getAllPlayers(): Promise<Player[]> {
  const client = createClient();
  return (await client.query(api.data.getAllPlayers, {})) as Player[];
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const client = createClient();
  return (await client.query(api.data.getPlayerById, { id })) as Player | null;
}

export async function createPlayer(input: CreatePlayerInput): Promise<Player> {
  const client = createClient();
  return (await client.mutation(api.data.createPlayer, {
    name: input.name,
    position: input.position,
  })) as Player;
}

export async function updatePlayer(id: number, input: UpdatePlayerInput): Promise<Player | null> {
  const client = createClient();
  return (await client.mutation(api.data.updatePlayer, {
    id,
    name: input.name,
    position: input.position,
  })) as Player | null;
}

export async function deletePlayer(id: number): Promise<boolean> {
  const client = createClient();
  return (await client.mutation(api.data.deletePlayer, { id })) as boolean;
}

export async function getAllMatches(): Promise<Match[]> {
  const client = createClient();
  return (await client.query(api.data.getAllMatches, {})) as Match[];
}

export async function getMatchById(id: number): Promise<Match | null> {
  const client = createClient();
  return (await client.query(api.data.getMatchById, { id })) as Match | null;
}

export async function createMatch(input: CreateMatchInput): Promise<Match> {
  const client = createClient();
  return (await client.mutation(api.data.createMatch, {
    date: input.date,
    time: input.time,
    price: input.price,
    location: input.location,
    pitch: input.pitch,
  })) as Match;
}

export async function updateMatch(id: number, input: UpdateMatchInput): Promise<Match | null> {
  const client = createClient();
  return (await client.mutation(api.data.updateMatch, {
    id,
    date: input.date,
    time: input.time,
    price: input.price,
    location: input.location,
    pitch: input.pitch,
  })) as Match | null;
}

export async function deleteMatch(id: number): Promise<boolean> {
  const client = createClient();
  return (await client.mutation(api.data.deleteMatch, { id })) as boolean;
}

export async function assignTeams(matchId: number, input: AssignTeamsInput): Promise<Match | null> {
  const client = createClient();
  return (await client.mutation(api.data.assignTeams, {
    matchId,
    teamA: input.teamA,
    teamB: input.teamB,
  })) as Match | null;
}

export async function setMatchWinner(matchId: number, winner: Winner): Promise<Match | null> {
  const client = createClient();
  return (await client.mutation(api.data.setMatchWinner, {
    matchId,
    winner,
  })) as Match | null;
}

export async function getAllPayments(): Promise<Payment[]> {
  const client = createClient();
  return (await client.query(api.data.getAllPayments, {})) as Payment[];
}

export async function markPaymentPaid(
  playerId: number,
  matchId: number,
  paid: boolean
): Promise<Payment | null> {
  const client = createClient();
  return (await client.mutation(api.data.markPaymentPaid, {
    playerId,
    matchId,
    paid,
  })) as Payment | null;
}

export async function markAllPaymentsPaidForPlayer(playerId: number): Promise<void> {
  const client = createClient();
  await client.mutation(api.data.markAllPaymentsPaidForPlayer, { playerId });
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const client = createClient();
  return (await client.query(api.data.getLeaderboard, {})) as LeaderboardEntry[];
}

export async function getPaymentMatrix(): Promise<PaymentMatrix> {
  const client = createClient();
  return (await client.query(api.data.getPaymentMatrix, {})) as PaymentMatrix;
}

export interface RandomizeTeamsInput {
  playerIds: number[];
  lockedTeamA?: number[];
  lockedTeamB?: number[];
}

export interface RandomizeTeamsResult {
  teamA: number[];
  teamB: number[];
}

interface RandomizePlayer {
  id: number;
  position: Position;
}

export async function randomizeTeams(input: RandomizeTeamsInput): Promise<RandomizeTeamsResult> {
  const { playerIds, lockedTeamA = [], lockedTeamB = [] } = input;

  if (playerIds.length === 0) {
    return { teamA: [...lockedTeamA], teamB: [...lockedTeamB] };
  }

  const lockedSet = new Set([...lockedTeamA, ...lockedTeamB]);
  const unassignedIds = playerIds.filter((id) => !lockedSet.has(id));

  const client = createClient();
  const fetchedPlayers = (await client.query(api.data.getPlayersByIds, {
    ids: unassignedIds,
  })) as RandomizePlayer[];

  const byPosition: Record<Position, RandomizePlayer[]> = {
    Attack: [],
    Midfield: [],
    Defense: [],
  };

  for (const player of fetchedPlayers) {
    byPosition[player.position].push(player);
  }

  for (const position of Object.keys(byPosition) as Position[]) {
    byPosition[position] = shuffle(byPosition[position]);
  }

  const teamA: number[] = [...lockedTeamA];
  const teamB: number[] = [...lockedTeamB];

  for (const position of ["Defense", "Midfield", "Attack"] as Position[]) {
    const positionPlayers = byPosition[position];
    for (let i = 0; i < positionPlayers.length; i += 1) {
      if (teamA.length <= teamB.length) {
        teamA.push(positionPlayers[i].id);
      } else {
        teamB.push(positionPlayers[i].id);
      }
    }
  }

  return { teamA, teamB };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
