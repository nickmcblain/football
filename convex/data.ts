/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { buildSeasonRoundup, calculateLeaderboard } from "../lib/statistics";
import type { SeasonRoundup } from "../lib/types";

const positionValidator = v.union(
  v.literal("Attack"),
  v.literal("Midfield"),
  v.literal("Defense")
);

const winnerValidator = v.union(
  v.literal("Team A"),
  v.literal("Team B"),
  v.literal("Draw"),
  v.literal("Not Played")
);

const seasonStatusValidator = v.union(
  v.literal("active"),
  v.literal("closed")
);

const PLAYER_COUNTER_KEY = "playerNextId";
const MATCH_COUNTER_KEY = "matchNextId";
const PAYMENT_COUNTER_KEY = "paymentNextId";
const SEASON_COUNTER_KEY = "seasonNextId";

type Position = "Attack" | "Midfield" | "Defense";
type Winner = "Team A" | "Team B" | "Draw" | "Not Played";
type FormResult = "W" | "D" | "L";

interface PlayerRecord {
  id: number;
  name: string;
  position: Position;
  points: number;
  totalOwed: number;
  paid: boolean;
  active: boolean;
}

interface MatchRecord {
  id: number;
  seasonId: number;
  date: string;
  time: string;
  price: number;
  location: string;
  pitch: string;
  teamA: number[];
  teamB: number[];
  winner: Winner;
}

interface SeasonRecord {
  id: number;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed";
  closedAt: number | null;
  matchCount: number;
  completedMatchCount: number;
}

interface PaymentRecord {
  id: number;
  playerId: number;
  matchId: number;
  amountOwed: number;
  paid: boolean;
}

interface LeaderboardEntry {
  rank: number;
  playerId: number;
  name: string;
  points: number;
  matchesPlayed: number;
  avgPointsPerMatch: number;
  lastPlayedDate: string | null;
  winRate: number;
  wins: number;
  draws: number;
  losses: number;
  form: FormResult[];
}

interface PaymentMatrix {
  players: Array<Pick<PlayerRecord, "id" | "name">>;
  matches: Array<Pick<MatchRecord, "id" | "date" | "time" | "price">>;
  payments: Array<Pick<PaymentRecord, "playerId" | "matchId" | "amountOwed" | "paid">>;
  totals: Array<{ playerId: number; totalOwed: number }>;
}

interface PlayerDoc {
  _id: any;
  legacyId: number;
  name: string;
  position: Position;
  points: number;
  totalOwed: number;
  paid: boolean;
  active?: boolean;
}

interface MatchDoc {
  _id: any;
  legacyId: number;
  date: string;
  time: string;
  price: number;
  location: string;
  pitch: string;
  teamA: number[];
  teamB: number[];
  winner: Winner;
  seasonId?: number;
}

interface SeasonDoc {
  _id: any;
  legacyId: number;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed";
  closedAt?: number;
}

interface PaymentDoc {
  _id: any;
  legacyId: number;
  playerId: number;
  matchId: number;
  amountOwed: number;
  paid: boolean;
}

const playerRecordValidator = v.object({
  id: v.number(),
  name: v.string(),
  position: positionValidator,
  points: v.number(),
  totalOwed: v.number(),
  paid: v.boolean(),
  active: v.boolean(),
});

const matchRecordValidator = v.object({
  id: v.number(),
  seasonId: v.number(),
  date: v.string(),
  time: v.string(),
  price: v.number(),
  location: v.string(),
  pitch: v.string(),
  teamA: v.array(v.number()),
  teamB: v.array(v.number()),
  winner: winnerValidator,
});

const paymentRecordValidator = v.object({
  id: v.number(),
  playerId: v.number(),
  matchId: v.number(),
  amountOwed: v.number(),
  paid: v.boolean(),
});

const seasonRecordValidator = v.object({
  id: v.number(),
  name: v.string(),
  slug: v.string(),
  startDate: v.string(),
  endDate: v.string(),
  status: seasonStatusValidator,
  closedAt: v.union(v.number(), v.null()),
  matchCount: v.number(),
  completedMatchCount: v.number(),
});

const leaderboardEntryValidator = v.object({
  rank: v.number(),
  playerId: v.number(),
  name: v.string(),
  points: v.number(),
  matchesPlayed: v.number(),
  avgPointsPerMatch: v.number(),
  lastPlayedDate: v.union(v.string(), v.null()),
  winRate: v.number(),
  wins: v.number(),
  draws: v.number(),
  losses: v.number(),
  form: v.array(v.union(v.literal("W"), v.literal("D"), v.literal("L"))),
});

function toPlayerRecord(doc: PlayerDoc): PlayerRecord {
  return {
    id: doc.legacyId,
    name: doc.name,
    position: doc.position,
    points: doc.points,
    totalOwed: doc.totalOwed,
    paid: doc.paid,
    active: doc.active ?? true,
  };
}

function toMatchRecord(doc: MatchDoc): MatchRecord {
  return {
    id: doc.legacyId,
    seasonId: doc.seasonId ?? 0,
    date: doc.date,
    time: doc.time,
    price: doc.price,
    location: doc.location,
    pitch: doc.pitch,
    teamA: doc.teamA,
    teamB: doc.teamB,
    winner: doc.winner,
  };
}

function toSeasonRecord(
  doc: SeasonDoc,
  matches: MatchDoc[],
): SeasonRecord {
  return {
    id: doc.legacyId,
    name: doc.name,
    slug: doc.slug,
    startDate: doc.startDate,
    endDate: doc.endDate,
    status: doc.status,
    closedAt: doc.closedAt ?? null,
    matchCount: matches.length,
    completedMatchCount: matches.filter((match) => match.winner !== "Not Played").length,
  };
}

function toPaymentRecord(doc: PaymentDoc): PaymentRecord {
  return {
    id: doc.legacyId,
    playerId: doc.playerId,
    matchId: doc.matchId,
    amountOwed: doc.amountOwed,
    paid: doc.paid,
  };
}

async function getCounterDocByKey(
  ctx: any,
  key: string
): Promise<{ _id: any; key: string; value: number } | null> {
  return await ctx.db
    .query("metadata")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .unique();
}

async function nextLegacyId(ctx: any, key: string): Promise<number> {
  const counter = await getCounterDocByKey(ctx, key);
  if (!counter) {
    await ctx.db.insert("metadata", { key, value: 2 });
    return 1;
  }
  const nextId = counter.value;
  await ctx.db.patch(counter._id, { value: nextId + 1 });
  return nextId;
}

async function setCounter(ctx: any, key: string, value: number): Promise<void> {
  const counter = await getCounterDocByKey(ctx, key);
  if (!counter) {
    await ctx.db.insert("metadata", { key, value });
    return;
  }
  await ctx.db.patch(counter._id, { value });
}

async function getPlayerDocByLegacyId(ctx: any, legacyId: number): Promise<PlayerDoc | null> {
  return await ctx.db
    .query("players")
    .withIndex("by_legacy_id", (q: any) => q.eq("legacyId", legacyId))
    .unique();
}

async function getPlayerDocByName(ctx: any, name: string): Promise<PlayerDoc | null> {
  const results = (await ctx.db
    .query("players")
    .withIndex("by_name", (q: any) => q.eq("name", name))
    .take(2)) as PlayerDoc[];
  return results[0] ?? null;
}

async function getMatchDocByLegacyId(ctx: any, legacyId: number): Promise<MatchDoc | null> {
  return await ctx.db
    .query("matches")
    .withIndex("by_legacy_id", (q: any) => q.eq("legacyId", legacyId))
    .unique();
}

async function getSeasonDocByLegacyId(ctx: any, legacyId: number): Promise<SeasonDoc | null> {
  return await ctx.db
    .query("seasons")
    .withIndex("by_legacy_id", (q: any) => q.eq("legacyId", legacyId))
    .unique();
}

async function getSeasonDocBySlug(ctx: any, slug: string): Promise<SeasonDoc | null> {
  return await ctx.db
    .query("seasons")
    .withIndex("by_slug", (q: any) => q.eq("slug", slug))
    .unique();
}

async function getActiveSeasonDoc(ctx: any): Promise<SeasonDoc | null> {
  return await ctx.db
    .query("seasons")
    .withIndex("by_status", (q: any) => q.eq("status", "active"))
    .first();
}

async function getPaymentDocByPlayerAndMatch(
  ctx: any,
  playerId: number,
  matchId: number
): Promise<PaymentDoc | null> {
  const results = (await ctx.db
    .query("payments")
    .withIndex("by_player_match", (q: any) => q.eq("playerId", playerId).eq("matchId", matchId))
    .take(2)) as PaymentDoc[];
  return results[0] ?? null;
}

async function listPlayersSortedByName(ctx: any): Promise<PlayerDoc[]> {
  return (await ctx.db.query("players").withIndex("by_name").take(500)) as PlayerDoc[];
}

async function listMatchesSortedByDateDesc(ctx: any): Promise<MatchDoc[]> {
  const matches = (await ctx.db.query("matches").withIndex("by_date").order("desc").take(2000)) as MatchDoc[];
  return matches.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }
    return b.legacyId - a.legacyId;
  });
}

async function listMatchesBySeason(ctx: any, seasonId: number): Promise<MatchDoc[]> {
  const matches = (await ctx.db
    .query("matches")
    .withIndex("by_season_id", (q: any) => q.eq("seasonId", seasonId))
    .take(1000)) as MatchDoc[];
  return matches.sort((a, b) => b.date.localeCompare(a.date) || b.legacyId - a.legacyId);
}

async function listSeasons(ctx: any): Promise<SeasonDoc[]> {
  return (await ctx.db
    .query("seasons")
    .withIndex("by_start_date")
    .order("desc")
    .take(100)) as SeasonDoc[];
}

async function listAllPayments(ctx: any): Promise<PaymentDoc[]> {
  return (await ctx.db.query("payments").take(5000)) as PaymentDoc[];
}

async function listPaymentsByMatch(ctx: any, matchId: number): Promise<PaymentDoc[]> {
  return (await ctx.db
    .query("payments")
    .withIndex("by_match_id", (q: any) => q.eq("matchId", matchId))
    .take(500)) as PaymentDoc[];
}

async function listPaymentsByPlayer(ctx: any, playerId: number): Promise<PaymentDoc[]> {
  return (await ctx.db
    .query("payments")
    .withIndex("by_player_id", (q: any) => q.eq("playerId", playerId))
    .take(2000)) as PaymentDoc[];
}

async function deletePaymentsForMatch(ctx: any, matchId: number): Promise<void> {
  const payments = await listPaymentsByMatch(ctx, matchId);
  for (const payment of payments) {
    await ctx.db.delete(payment._id);
  }
}

async function recalculateMatchPayments(ctx: any, matchDoc: MatchDoc): Promise<void> {
  if (matchDoc.winner === "Not Played") {
    return;
  }

  const attendees = [...matchDoc.teamA, ...matchDoc.teamB];
  if (attendees.length === 0) {
    return;
  }

  if (new Set(attendees).size !== attendees.length) {
    throw new Error("UNIQUE constraint failed: payments.player_id, payments.match_id");
  }

  await deletePaymentsForMatch(ctx, matchDoc.legacyId);

  const amountPerPerson = matchDoc.price / attendees.length;
  for (const playerId of attendees) {
    const legacyId = await nextLegacyId(ctx, PAYMENT_COUNTER_KEY);
    await ctx.db.insert("payments", {
      legacyId,
      playerId,
      matchId: matchDoc.legacyId,
      amountOwed: amountPerPerson,
      paid: false,
    });
  }
}

async function recalculatePlayerTotal(ctx: any, playerId: number): Promise<void> {
  const playerDoc = await getPlayerDocByLegacyId(ctx, playerId);
  if (!playerDoc) {
    return;
  }

  const payments = await listPaymentsByPlayer(ctx, playerId);
  const totalOwed = payments
    .filter((payment) => !payment.paid)
    .reduce((sum, payment) => sum + payment.amountOwed, 0);
  const allPaid = totalOwed === 0;

  await ctx.db.patch(playerDoc._id, {
    totalOwed,
    paid: allPaid,
  });
}

async function recalculateAllPlayerTotals(ctx: any): Promise<void> {
  const players = await listPlayersSortedByName(ctx);
  for (const player of players) {
    await recalculatePlayerTotal(ctx, player.legacyId);
  }
}

function statsPlayers(players: PlayerDoc[]) {
  return players.map((player) => ({
    id: player.legacyId,
    name: player.name,
  }));
}

function statsMatches(matches: MatchDoc[]) {
  return matches.map((match) => ({
    id: match.legacyId,
    seasonId: match.seasonId ?? 0,
    date: match.date,
    teamA: match.teamA,
    teamB: match.teamB,
    winner: match.winner,
  }));
}

async function playerRecordsWithComputedPoints(ctx: any): Promise<PlayerRecord[]> {
  const players = await listPlayersSortedByName(ctx);
  const matches = await listMatchesSortedByDateDesc(ctx);
  const points = new Map(
    calculateLeaderboard(statsPlayers(players), statsMatches(matches), true).map((entry) => [
      entry.playerId,
      entry.points,
    ]),
  );
  return players.map((player) => ({
    ...toPlayerRecord(player),
    points: points.get(player.legacyId) ?? 0,
  }));
}

async function regenerateRoundupIfClosed(ctx: any, seasonId: number | undefined) {
  if (seasonId === undefined) return;
  const season = await getSeasonDocByLegacyId(ctx, seasonId);
  if (!season || season.status !== "closed") return;

  const players = await listPlayersSortedByName(ctx);
  const matches = await listMatchesBySeason(ctx, seasonId);
  const generatedAt = Date.now();
  const snapshot = buildSeasonRoundup(
    {
      id: season.legacyId,
      name: season.name,
      slug: season.slug,
      startDate: season.startDate,
      endDate: season.endDate,
      closedAt: season.closedAt ?? generatedAt,
    },
    statsPlayers(players),
    statsMatches(matches),
    generatedAt,
  );
  const existing = await ctx.db
    .query("roundups")
    .withIndex("by_season_id", (q: any) => q.eq("seasonId", seasonId))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { generatedAt, snapshot });
  } else {
    await ctx.db.insert("roundups", { seasonId, generatedAt, snapshot });
  }
}

export const getAllPlayers = query({
  args: {},
  returns: v.array(playerRecordValidator),
  handler: async (ctx): Promise<PlayerRecord[]> => {
    return await playerRecordsWithComputedPoints(ctx);
  },
});

export const getPlayerById = query({
  args: { id: v.number() },
  returns: v.union(playerRecordValidator, v.null()),
  handler: async (ctx, args): Promise<PlayerRecord | null> => {
    const player = await getPlayerDocByLegacyId(ctx, args.id);
    if (!player) return null;
    const records = await playerRecordsWithComputedPoints(ctx);
    return records.find((record) => record.id === args.id) ?? null;
  },
});

export const getPlayersByIds = query({
  args: { ids: v.array(v.number()) },
  returns: v.array(playerRecordValidator),
  handler: async (ctx, args): Promise<PlayerRecord[]> => {
    const players: PlayerRecord[] = [];
    for (const id of args.ids) {
      const player = await getPlayerDocByLegacyId(ctx, id);
      if (player && (player.active ?? true)) {
        players.push(toPlayerRecord(player));
      }
    }
    return players;
  },
});

export const createPlayer = mutation({
  args: {
    name: v.string(),
    position: positionValidator,
  },
  returns: playerRecordValidator,
  handler: async (ctx, args): Promise<PlayerRecord> => {
    const trimmedName = args.name.trim();
    if (trimmedName === "") {
      throw new Error("Name is required");
    }

    const existingPlayer = await getPlayerDocByName(ctx, trimmedName);
    if (existingPlayer) {
      throw new Error("UNIQUE constraint failed: players.name");
    }

    const legacyId = await nextLegacyId(ctx, PLAYER_COUNTER_KEY);
    await ctx.db.insert("players", {
      legacyId,
      name: trimmedName,
      position: args.position,
      points: 0,
      totalOwed: 0,
      paid: true,
      active: true,
    });

    const player = await getPlayerDocByLegacyId(ctx, legacyId);
    if (!player) {
      throw new Error("Failed to create player");
    }
    return toPlayerRecord(player);
  },
});

export const updatePlayer = mutation({
  args: {
    id: v.number(),
    name: v.optional(v.string()),
    position: v.optional(positionValidator),
    active: v.optional(v.boolean()),
  },
  returns: v.union(playerRecordValidator, v.null()),
  handler: async (ctx, args): Promise<PlayerRecord | null> => {
    const playerDoc = await getPlayerDocByLegacyId(ctx, args.id);
    if (!playerDoc) {
      return null;
    }

    const nextName = args.name !== undefined ? args.name.trim() : playerDoc.name;
    if (nextName === "") {
      throw new Error("Name must be a non-empty string");
    }

    if (nextName !== playerDoc.name) {
      const existingPlayer = await getPlayerDocByName(ctx, nextName);
      if (existingPlayer && existingPlayer.legacyId !== args.id) {
        throw new Error("UNIQUE constraint failed: players.name");
      }
    }

    const nextPosition = args.position ?? playerDoc.position;

    await ctx.db.patch(playerDoc._id, {
      name: nextName,
      position: nextPosition,
      active: args.active ?? playerDoc.active ?? true,
    });

    const records = await playerRecordsWithComputedPoints(ctx);
    return records.find((record) => record.id === args.id) ?? null;
  },
});

export const deletePlayer = mutation({
  args: { id: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    const playerDoc = await getPlayerDocByLegacyId(ctx, args.id);
    if (!playerDoc) {
      return false;
    }

    const matches = await listMatchesSortedByDateDesc(ctx);
    const hasHistory = matches.some(
      (match) => match.teamA.includes(args.id) || match.teamB.includes(args.id),
    );
    if (hasHistory) {
      await ctx.db.patch(playerDoc._id, { active: false });
      return true;
    }

    const playerPayments = await listPaymentsByPlayer(ctx, args.id);
    for (const payment of playerPayments) {
      await ctx.db.delete(payment._id);
    }

    await ctx.db.delete(playerDoc._id);
    return true;
  },
});

export const getAllMatches = query({
  args: { seasonId: v.optional(v.number()) },
  returns: v.array(matchRecordValidator),
  handler: async (ctx, args): Promise<MatchRecord[]> => {
    const matches = args.seasonId === undefined
      ? await listMatchesSortedByDateDesc(ctx)
      : await listMatchesBySeason(ctx, args.seasonId);
    return matches.map(toMatchRecord);
  },
});

export const getMatchById = query({
  args: { id: v.number() },
  returns: v.union(matchRecordValidator, v.null()),
  handler: async (ctx, args): Promise<MatchRecord | null> => {
    const match = await getMatchDocByLegacyId(ctx, args.id);
    return match ? toMatchRecord(match) : null;
  },
});

export const createMatch = mutation({
  args: {
    date: v.string(),
    time: v.string(),
    price: v.number(),
    location: v.optional(v.string()),
    pitch: v.optional(v.string()),
  },
  returns: matchRecordValidator,
  handler: async (ctx, args): Promise<MatchRecord> => {
    const activeSeason = await getActiveSeasonDoc(ctx);
    if (!activeSeason) {
      throw new Error("Create an active season before adding a match");
    }
    const legacyId = await nextLegacyId(ctx, MATCH_COUNTER_KEY);
    await ctx.db.insert("matches", {
      legacyId,
      seasonId: activeSeason.legacyId,
      date: args.date,
      time: args.time,
      price: args.price,
      location: args.location ?? "",
      pitch: args.pitch ?? "",
      teamA: [],
      teamB: [],
      winner: "Not Played",
    });

    const match = await getMatchDocByLegacyId(ctx, legacyId);
    if (!match) {
      throw new Error("Failed to create match");
    }
    return toMatchRecord(match);
  },
});

export const updateMatch = mutation({
  args: {
    id: v.number(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    price: v.optional(v.number()),
    location: v.optional(v.string()),
    pitch: v.optional(v.string()),
  },
  returns: v.union(matchRecordValidator, v.null()),
  handler: async (ctx, args): Promise<MatchRecord | null> => {
    const matchDoc = await getMatchDocByLegacyId(ctx, args.id);
    if (!matchDoc) {
      return null;
    }

    const nextMatch: MatchDoc = {
      ...matchDoc,
      date: args.date ?? matchDoc.date,
      time: args.time ?? matchDoc.time,
      price: args.price ?? matchDoc.price,
      location: args.location ?? matchDoc.location,
      pitch: args.pitch ?? matchDoc.pitch,
    };

    await ctx.db.patch(matchDoc._id, {
      date: nextMatch.date,
      time: nextMatch.time,
      price: nextMatch.price,
      location: nextMatch.location,
      pitch: nextMatch.pitch,
    });

    if (args.price !== undefined && matchDoc.winner !== "Not Played") {
      await recalculateMatchPayments(ctx, nextMatch);
    }

    await regenerateRoundupIfClosed(ctx, matchDoc.seasonId);
    return toMatchRecord(nextMatch);
  },
});

export const deleteMatch = mutation({
  args: { id: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args): Promise<boolean> => {
    const matchDoc = await getMatchDocByLegacyId(ctx, args.id);
    if (!matchDoc) {
      return false;
    }

    await deletePaymentsForMatch(ctx, args.id);
    await ctx.db.delete(matchDoc._id);

    await recalculateAllPlayerTotals(ctx);
    await regenerateRoundupIfClosed(ctx, matchDoc.seasonId);
    return true;
  },
});

export const assignTeams = mutation({
  args: {
    matchId: v.number(),
    teamA: v.array(v.number()),
    teamB: v.array(v.number()),
  },
  returns: v.union(matchRecordValidator, v.null()),
  handler: async (ctx, args): Promise<MatchRecord | null> => {
    const matchDoc = await getMatchDocByLegacyId(ctx, args.matchId);
    if (!matchDoc) {
      return null;
    }

    const overlap = args.teamA.filter((id) => args.teamB.includes(id));
    if (overlap.length > 0) {
      throw new Error("Players cannot be on both teams");
    }

    const allPlayerIds = [...args.teamA, ...args.teamB];
    for (const playerId of allPlayerIds) {
      const player = await getPlayerDocByLegacyId(ctx, playerId);
      if (!player || !(player.active ?? true)) {
        throw new Error(`Player with ID ${playerId} not found`);
      }
    }

    const updatedMatch: MatchDoc = {
      ...matchDoc,
      teamA: args.teamA,
      teamB: args.teamB,
    };

    await ctx.db.patch(matchDoc._id, {
      teamA: args.teamA,
      teamB: args.teamB,
    });

    if (matchDoc.winner !== "Not Played") {
      await recalculateMatchPayments(ctx, updatedMatch);
    }

    await regenerateRoundupIfClosed(ctx, matchDoc.seasonId);
    return toMatchRecord(updatedMatch);
  },
});

export const setMatchWinner = mutation({
  args: {
    matchId: v.number(),
    winner: winnerValidator,
  },
  returns: v.union(matchRecordValidator, v.null()),
  handler: async (ctx, args): Promise<MatchRecord | null> => {
    const matchDoc = await getMatchDocByLegacyId(ctx, args.matchId);
    if (!matchDoc) {
      return null;
    }

    const hasTeams = matchDoc.teamA.length > 0 || matchDoc.teamB.length > 0;
    if (!hasTeams && args.winner !== "Not Played") {
      throw new Error("Cannot set winner without teams assigned");
    }
    const season = matchDoc.seasonId === undefined
      ? null
      : await getSeasonDocByLegacyId(ctx, matchDoc.seasonId);
    if (season?.status === "closed" && args.winner === "Not Played") {
      throw new Error("Closed-season matches must remain completed");
    }

    const updatedMatch: MatchDoc = {
      ...matchDoc,
      winner: args.winner,
    };

    await ctx.db.patch(matchDoc._id, { winner: args.winner });

    if (args.winner === "Not Played") {
      await deletePaymentsForMatch(ctx, args.matchId);
    } else {
      await recalculateMatchPayments(ctx, updatedMatch);
    }

    await recalculateAllPlayerTotals(ctx);
    await regenerateRoundupIfClosed(ctx, matchDoc.seasonId);
    return toMatchRecord(updatedMatch);
  },
});

export const getAllPayments = query({
  args: {},
  returns: v.array(paymentRecordValidator),
  handler: async (ctx): Promise<PaymentRecord[]> => {
    const payments = await listAllPayments(ctx);
    return payments.map(toPaymentRecord);
  },
});

export const getPaymentMatrix = query({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<PaymentMatrix> => {
    const players = (await listPlayersSortedByName(ctx)).map((player) => ({
      id: player.legacyId,
      name: player.name,
    }));

    const matches = (await listMatchesSortedByDateDesc(ctx))
      .filter((match) => match.winner !== "Not Played")
      .map((match) => ({
        id: match.legacyId,
        date: match.date,
        time: match.time,
        price: match.price,
      }));

    const allPayments = await listAllPayments(ctx);
    const payments = allPayments.map((payment) => ({
      playerId: payment.playerId,
      matchId: payment.matchId,
      amountOwed: payment.amountOwed,
      paid: payment.paid,
    }));

    const totals = players.map((player) => {
      const playerPayments = allPayments.filter(
        (payment) => payment.playerId === player.id && !payment.paid
      );
      const totalOwed = playerPayments.reduce((sum, payment) => sum + payment.amountOwed, 0);
      return { playerId: player.id, totalOwed };
    });

    return { players, matches, payments, totals };
  },
});

export const markPaymentPaid = mutation({
  args: {
    playerId: v.number(),
    matchId: v.number(),
    paid: v.boolean(),
  },
  returns: v.union(paymentRecordValidator, v.null()),
  handler: async (ctx, args): Promise<PaymentRecord | null> => {
    const payment = await getPaymentDocByPlayerAndMatch(ctx, args.playerId, args.matchId);
    if (!payment) {
      return null;
    }

    await ctx.db.patch(payment._id, { paid: args.paid });
    await recalculatePlayerTotal(ctx, args.playerId);

    const updatedPayment = await getPaymentDocByPlayerAndMatch(ctx, args.playerId, args.matchId);
    return updatedPayment ? toPaymentRecord(updatedPayment) : null;
  },
});

export const markAllPaymentsPaidForPlayer = mutation({
  args: { playerId: v.number() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const payments = await listPaymentsByPlayer(ctx, args.playerId);
    for (const payment of payments) {
      await ctx.db.patch(payment._id, { paid: true });
    }
    await recalculatePlayerTotal(ctx, args.playerId);
    return null;
  },
});

export const getLeaderboard = query({
  args: { season: v.optional(v.string()) },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, args): Promise<LeaderboardEntry[]> => {
    const players = await listPlayersSortedByName(ctx);
    if (!args.season || args.season === "all-time") {
      const matches = await listMatchesSortedByDateDesc(ctx);
      return calculateLeaderboard(statsPlayers(players), statsMatches(matches), true);
    }

    const season = await getSeasonDocBySlug(ctx, args.season);
    if (!season) return [];
    const matches = await listMatchesBySeason(ctx, season.legacyId);
    return calculateLeaderboard(statsPlayers(players), statsMatches(matches), false);
  },
});

function slugifySeasonName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const getSeasons = query({
  args: {},
  returns: v.array(seasonRecordValidator),
  handler: async (ctx): Promise<SeasonRecord[]> => {
    const seasons = await listSeasons(ctx);
    return await Promise.all(
      seasons.map(async (season) =>
        toSeasonRecord(season, await listMatchesBySeason(ctx, season.legacyId)),
      ),
    );
  },
});

export const createSeason = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: seasonRecordValidator,
  handler: async (ctx, args): Promise<SeasonRecord> => {
    const activeSeason = await getActiveSeasonDoc(ctx);
    if (activeSeason) {
      throw new Error(`Close ${activeSeason.name} before creating a new season`);
    }
    const name = args.name.trim();
    const slug = slugifySeasonName(name);
    if (!name || !slug) throw new Error("Season name is required");
    if (await getSeasonDocBySlug(ctx, slug)) throw new Error("A season with this name already exists");

    const legacyId = await nextLegacyId(ctx, SEASON_COUNTER_KEY);
    await ctx.db.insert("seasons", {
      legacyId,
      name,
      slug,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "active",
    });
    const season = await getSeasonDocByLegacyId(ctx, legacyId);
    if (!season) throw new Error("Failed to create season");
    return toSeasonRecord(season, []);
  },
});

export const updateSeason = mutation({
  args: {
    id: v.number(),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.union(seasonRecordValidator, v.null()),
  handler: async (ctx, args): Promise<SeasonRecord | null> => {
    const season = await getSeasonDocByLegacyId(ctx, args.id);
    if (!season) return null;
    const name = args.name?.trim() || season.name;
    await ctx.db.patch(season._id, {
      name,
      startDate: args.startDate ?? season.startDate,
      endDate: args.endDate ?? season.endDate,
    });
    const updated = await getSeasonDocByLegacyId(ctx, args.id);
    if (!updated) return null;
    if (updated.status === "closed") await regenerateRoundupIfClosed(ctx, updated.legacyId);
    return toSeasonRecord(updated, await listMatchesBySeason(ctx, updated.legacyId));
  },
});

export const closeSeason = mutation({
  args: { id: v.number() },
  returns: seasonRecordValidator,
  handler: async (ctx, args): Promise<SeasonRecord> => {
    const season = await getSeasonDocByLegacyId(ctx, args.id);
    if (!season) throw new Error("Season not found");
    const matches = await listMatchesBySeason(ctx, season.legacyId);
    const incomplete = matches.filter((match) => match.winner === "Not Played");
    if (incomplete.length > 0) {
      throw new Error(
        `Resolve ${incomplete.length} unfinished ${incomplete.length === 1 ? "match" : "matches"} before closing`,
      );
    }
    const closedAt = Date.now();
    await ctx.db.patch(season._id, { status: "closed", closedAt });
    await regenerateRoundupIfClosed(ctx, season.legacyId);
    const updated = await getSeasonDocByLegacyId(ctx, season.legacyId);
    if (!updated) throw new Error("Failed to close season");
    return toSeasonRecord(updated, matches);
  },
});

export const getRoundup = query({
  args: { slug: v.string() },
  returns: v.any(),
  handler: async (ctx, args): Promise<SeasonRoundup | null> => {
    const season = await getSeasonDocBySlug(ctx, args.slug);
    if (!season || season.status !== "closed") return null;
    const roundup = await ctx.db
      .query("roundups")
      .withIndex("by_season_id", (q: any) => q.eq("seasonId", season.legacyId))
      .unique();
    return (roundup?.snapshot as SeasonRoundup | undefined) ?? null;
  },
});

export const migrateInitialSeason = mutation({
  args: {},
  returns: v.object({
    seasonId: v.number(),
    matchesUpdated: v.number(),
    playersUpdated: v.number(),
  }),
  handler: async (ctx) => {
    const existingSeasons = await listSeasons(ctx);
    let season = existingSeasons.find((item) => item.slug === "2025-26");
    if (!season) {
      const legacyId = await nextLegacyId(ctx, SEASON_COUNTER_KEY);
      const seasonId = await ctx.db.insert("seasons", {
        legacyId,
        name: "2025/26",
        slug: "2025-26",
        startDate: "2025-11-24",
        endDate: "2026-07-27",
        status: "active",
      });
      season = await ctx.db.get(seasonId) as SeasonDoc;
    }

    const matches = await listMatchesSortedByDateDesc(ctx);
    let matchesUpdated = 0;
    for (const match of matches) {
      if (match.seasonId === undefined) {
        await ctx.db.patch(match._id, { seasonId: season.legacyId });
        matchesUpdated += 1;
      }
    }

    const players = await listPlayersSortedByName(ctx);
    let playersUpdated = 0;
    for (const player of players) {
      if (player.active === undefined) {
        await ctx.db.patch(player._id, { active: true });
        playersUpdated += 1;
      }
    }
    return { seasonId: season.legacyId, matchesUpdated, playersUpdated };
  },
});

const importedPlayerValidator = v.object({
  id: v.number(),
  name: v.string(),
  position: positionValidator,
  points: v.number(),
  totalOwed: v.number(),
  paid: v.boolean(),
});

const importedMatchValidator = v.object({
  id: v.number(),
  seasonId: v.optional(v.number()),
  date: v.string(),
  time: v.string(),
  price: v.number(),
  location: v.string(),
  pitch: v.string(),
  teamA: v.array(v.number()),
  teamB: v.array(v.number()),
  winner: winnerValidator,
});

const importedPaymentValidator = v.object({
  id: v.number(),
  playerId: v.number(),
  matchId: v.number(),
  amountOwed: v.number(),
  paid: v.boolean(),
});

async function clearTable(ctx: any, tableName: string): Promise<void> {
  const docs = (await ctx.db.query(tableName).take(10000)) as Array<{ _id: any }>;
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

export const importSnapshot = mutation({
  args: {
    players: v.array(importedPlayerValidator),
    matches: v.array(importedMatchValidator),
    payments: v.array(importedPaymentValidator),
  },
  returns: v.object({
    imported: v.object({
      players: v.number(),
      matches: v.number(),
      payments: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    await clearTable(ctx, "roundups");
    await clearTable(ctx, "seasons");
    await clearTable(ctx, "payments");
    await clearTable(ctx, "matches");
    await clearTable(ctx, "players");
    await clearTable(ctx, "metadata");

    await ctx.db.insert("seasons", {
      legacyId: 1,
      name: "2025/26",
      slug: "2025-26",
      startDate: "2025-11-24",
      endDate: "2026-07-27",
      status: "active",
    });

    let maxPlayerId = 0;
    for (const player of args.players) {
      maxPlayerId = Math.max(maxPlayerId, player.id);
      await ctx.db.insert("players", {
        legacyId: player.id,
        name: player.name,
        position: player.position,
        points: player.points,
        totalOwed: player.totalOwed,
        paid: player.paid,
        active: true,
      });
    }

    let maxMatchId = 0;
    for (const match of args.matches) {
      maxMatchId = Math.max(maxMatchId, match.id);
      await ctx.db.insert("matches", {
        legacyId: match.id,
        seasonId: match.seasonId ?? 1,
        date: match.date,
        time: match.time,
        price: match.price,
        location: match.location,
        pitch: match.pitch,
        teamA: match.teamA,
        teamB: match.teamB,
        winner: match.winner,
      });
    }

    let maxPaymentId = 0;
    for (const payment of args.payments) {
      maxPaymentId = Math.max(maxPaymentId, payment.id);
      await ctx.db.insert("payments", {
        legacyId: payment.id,
        playerId: payment.playerId,
        matchId: payment.matchId,
        amountOwed: payment.amountOwed,
        paid: payment.paid,
      });
    }

    await setCounter(ctx, PLAYER_COUNTER_KEY, maxPlayerId + 1);
    await setCounter(ctx, MATCH_COUNTER_KEY, maxMatchId + 1);
    await setCounter(ctx, PAYMENT_COUNTER_KEY, maxPaymentId + 1);
    await setCounter(ctx, SEASON_COUNTER_KEY, 2);

    return {
      imported: {
        players: args.players.length,
        matches: args.matches.length,
        payments: args.payments.length,
      },
    };
  },
});
