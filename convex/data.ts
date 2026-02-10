/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

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

const PLAYER_COUNTER_KEY = "playerNextId";
const MATCH_COUNTER_KEY = "matchNextId";
const PAYMENT_COUNTER_KEY = "paymentNextId";

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
}

interface MatchRecord {
  id: number;
  date: string;
  time: string;
  price: number;
  location: string;
  pitch: string;
  teamA: number[];
  teamB: number[];
  winner: Winner;
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
}

interface PaymentDoc {
  _id: any;
  legacyId: number;
  playerId: number;
  matchId: number;
  amountOwed: number;
  paid: boolean;
}

function toPlayerRecord(doc: PlayerDoc): PlayerRecord {
  return {
    id: doc.legacyId,
    name: doc.name,
    position: doc.position,
    points: doc.points,
    totalOwed: doc.totalOwed,
    paid: doc.paid,
  };
}

function toMatchRecord(doc: MatchDoc): MatchRecord {
  return {
    id: doc.legacyId,
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
    .collect()) as PlayerDoc[];
  return results[0] ?? null;
}

async function getMatchDocByLegacyId(ctx: any, legacyId: number): Promise<MatchDoc | null> {
  return await ctx.db
    .query("matches")
    .withIndex("by_legacy_id", (q: any) => q.eq("legacyId", legacyId))
    .unique();
}

async function getPaymentDocByPlayerAndMatch(
  ctx: any,
  playerId: number,
  matchId: number
): Promise<PaymentDoc | null> {
  const results = (await ctx.db
    .query("payments")
    .withIndex("by_player_match", (q: any) => q.eq("playerId", playerId).eq("matchId", matchId))
    .collect()) as PaymentDoc[];
  return results[0] ?? null;
}

async function listPlayersSortedByName(ctx: any): Promise<PlayerDoc[]> {
  return (await ctx.db.query("players").withIndex("by_name").collect()) as PlayerDoc[];
}

async function listPlayersSortedByPointsDesc(ctx: any): Promise<PlayerDoc[]> {
  const players = (await ctx.db.query("players").collect()) as PlayerDoc[];
  return players.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    return a.name.localeCompare(b.name);
  });
}

async function listMatchesSortedByDateDesc(ctx: any): Promise<MatchDoc[]> {
  const matches = (await ctx.db.query("matches").collect()) as MatchDoc[];
  return matches.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) {
      return byDate;
    }
    return b.legacyId - a.legacyId;
  });
}

async function listAllPayments(ctx: any): Promise<PaymentDoc[]> {
  return (await ctx.db.query("payments").collect()) as PaymentDoc[];
}

async function listPaymentsByMatch(ctx: any, matchId: number): Promise<PaymentDoc[]> {
  return (await ctx.db
    .query("payments")
    .withIndex("by_match_id", (q: any) => q.eq("matchId", matchId))
    .collect()) as PaymentDoc[];
}

async function listPaymentsByPlayer(ctx: any, playerId: number): Promise<PaymentDoc[]> {
  return (await ctx.db
    .query("payments")
    .withIndex("by_player_id", (q: any) => q.eq("playerId", playerId))
    .collect()) as PaymentDoc[];
}

async function addPointsToPlayers(ctx: any, playerIds: number[], points: number): Promise<void> {
  for (const legacyId of playerIds) {
    const playerDoc = await getPlayerDocByLegacyId(ctx, legacyId);
    if (!playerDoc) {
      continue;
    }
    await ctx.db.patch(playerDoc._id, { points: playerDoc.points + points });
  }
}

async function removePointsFromPlayers(ctx: any, playerIds: number[], points: number): Promise<void> {
  for (const legacyId of playerIds) {
    const playerDoc = await getPlayerDocByLegacyId(ctx, legacyId);
    if (!playerDoc) {
      continue;
    }
    await ctx.db.patch(playerDoc._id, { points: Math.max(0, playerDoc.points - points) });
  }
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

export const getAllPlayers = queryGeneric({
  handler: async (ctx): Promise<PlayerRecord[]> => {
    const players = await listPlayersSortedByName(ctx);
    return players.map(toPlayerRecord);
  },
});

export const getPlayerById = queryGeneric({
  args: { id: v.number() },
  handler: async (ctx, args): Promise<PlayerRecord | null> => {
    const player = await getPlayerDocByLegacyId(ctx, args.id);
    return player ? toPlayerRecord(player) : null;
  },
});

export const getPlayersByIds = queryGeneric({
  args: { ids: v.array(v.number()) },
  handler: async (ctx, args): Promise<PlayerRecord[]> => {
    const players: PlayerRecord[] = [];
    for (const id of args.ids) {
      const player = await getPlayerDocByLegacyId(ctx, id);
      if (player) {
        players.push(toPlayerRecord(player));
      }
    }
    return players;
  },
});

export const createPlayer = mutationGeneric({
  args: {
    name: v.string(),
    position: positionValidator,
  },
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
    });

    const player = await getPlayerDocByLegacyId(ctx, legacyId);
    if (!player) {
      throw new Error("Failed to create player");
    }
    return toPlayerRecord(player);
  },
});

export const updatePlayer = mutationGeneric({
  args: {
    id: v.number(),
    name: v.optional(v.string()),
    position: v.optional(positionValidator),
  },
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
    });

    const updatedPlayer = await getPlayerDocByLegacyId(ctx, args.id);
    return updatedPlayer ? toPlayerRecord(updatedPlayer) : null;
  },
});

export const deletePlayer = mutationGeneric({
  args: { id: v.number() },
  handler: async (ctx, args): Promise<boolean> => {
    const playerDoc = await getPlayerDocByLegacyId(ctx, args.id);
    if (!playerDoc) {
      return false;
    }

    const matches = await listMatchesSortedByDateDesc(ctx);
    for (const match of matches) {
      const inTeamA = match.teamA.includes(args.id);
      const inTeamB = match.teamB.includes(args.id);
      if (!inTeamA && !inTeamB) {
        continue;
      }

      const newTeamA = match.teamA.filter((id) => id !== args.id);
      const newTeamB = match.teamB.filter((id) => id !== args.id);

      await ctx.db.patch(match._id, {
        teamA: newTeamA,
        teamB: newTeamB,
      });

      if (match.winner !== "Not Played") {
        await recalculateMatchPayments(ctx, {
          ...match,
          teamA: newTeamA,
          teamB: newTeamB,
        });
      }
    }

    const playerPayments = await listPaymentsByPlayer(ctx, args.id);
    for (const payment of playerPayments) {
      await ctx.db.delete(payment._id);
    }

    await ctx.db.delete(playerDoc._id);
    return true;
  },
});

export const getAllMatches = queryGeneric({
  handler: async (ctx): Promise<MatchRecord[]> => {
    const matches = await listMatchesSortedByDateDesc(ctx);
    return matches.map(toMatchRecord);
  },
});

export const getMatchById = queryGeneric({
  args: { id: v.number() },
  handler: async (ctx, args): Promise<MatchRecord | null> => {
    const match = await getMatchDocByLegacyId(ctx, args.id);
    return match ? toMatchRecord(match) : null;
  },
});

export const createMatch = mutationGeneric({
  args: {
    date: v.string(),
    time: v.string(),
    price: v.number(),
    location: v.optional(v.string()),
    pitch: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<MatchRecord> => {
    const legacyId = await nextLegacyId(ctx, MATCH_COUNTER_KEY);
    await ctx.db.insert("matches", {
      legacyId,
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

export const updateMatch = mutationGeneric({
  args: {
    id: v.number(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    price: v.optional(v.number()),
    location: v.optional(v.string()),
    pitch: v.optional(v.string()),
  },
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

    return toMatchRecord(nextMatch);
  },
});

export const deleteMatch = mutationGeneric({
  args: { id: v.number() },
  handler: async (ctx, args): Promise<boolean> => {
    const matchDoc = await getMatchDocByLegacyId(ctx, args.id);
    if (!matchDoc) {
      return false;
    }

    if (matchDoc.winner === "Team A") {
      await removePointsFromPlayers(ctx, matchDoc.teamA, 3);
      await removePointsFromPlayers(ctx, matchDoc.teamB, 1);
    } else if (matchDoc.winner === "Team B") {
      await removePointsFromPlayers(ctx, matchDoc.teamB, 3);
      await removePointsFromPlayers(ctx, matchDoc.teamA, 1);
    } else if (matchDoc.winner === "Draw") {
      await removePointsFromPlayers(ctx, matchDoc.teamA, 2);
      await removePointsFromPlayers(ctx, matchDoc.teamB, 2);
    }

    await deletePaymentsForMatch(ctx, args.id);
    await ctx.db.delete(matchDoc._id);

    await recalculateAllPlayerTotals(ctx);
    return true;
  },
});

export const assignTeams = mutationGeneric({
  args: {
    matchId: v.number(),
    teamA: v.array(v.number()),
    teamB: v.array(v.number()),
  },
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
      if (!player) {
        throw new Error(`Player with ID ${playerId} not found`);
      }
    }

    if (matchDoc.winner !== "Not Played") {
      if (matchDoc.winner === "Team A") {
        await removePointsFromPlayers(ctx, matchDoc.teamA, 3);
        await removePointsFromPlayers(ctx, matchDoc.teamB, 1);
      } else if (matchDoc.winner === "Team B") {
        await removePointsFromPlayers(ctx, matchDoc.teamB, 3);
        await removePointsFromPlayers(ctx, matchDoc.teamA, 1);
      } else if (matchDoc.winner === "Draw") {
        await removePointsFromPlayers(ctx, matchDoc.teamA, 2);
        await removePointsFromPlayers(ctx, matchDoc.teamB, 2);
      }

      if (matchDoc.winner === "Team A") {
        await addPointsToPlayers(ctx, args.teamA, 3);
        await addPointsToPlayers(ctx, args.teamB, 1);
      } else if (matchDoc.winner === "Team B") {
        await addPointsToPlayers(ctx, args.teamB, 3);
        await addPointsToPlayers(ctx, args.teamA, 1);
      } else if (matchDoc.winner === "Draw") {
        await addPointsToPlayers(ctx, args.teamA, 2);
        await addPointsToPlayers(ctx, args.teamB, 2);
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

    return toMatchRecord(updatedMatch);
  },
});

export const setMatchWinner = mutationGeneric({
  args: {
    matchId: v.number(),
    winner: winnerValidator,
  },
  handler: async (ctx, args): Promise<MatchRecord | null> => {
    const matchDoc = await getMatchDocByLegacyId(ctx, args.matchId);
    if (!matchDoc) {
      return null;
    }

    const hasTeams = matchDoc.teamA.length > 0 || matchDoc.teamB.length > 0;
    if (!hasTeams && args.winner !== "Not Played") {
      throw new Error("Cannot set winner without teams assigned");
    }

    if (matchDoc.winner === "Team A") {
      await removePointsFromPlayers(ctx, matchDoc.teamA, 3);
      await removePointsFromPlayers(ctx, matchDoc.teamB, 1);
    } else if (matchDoc.winner === "Team B") {
      await removePointsFromPlayers(ctx, matchDoc.teamB, 3);
      await removePointsFromPlayers(ctx, matchDoc.teamA, 1);
    } else if (matchDoc.winner === "Draw") {
      await removePointsFromPlayers(ctx, matchDoc.teamA, 2);
      await removePointsFromPlayers(ctx, matchDoc.teamB, 2);
    }

    if (args.winner === "Team A") {
      await addPointsToPlayers(ctx, matchDoc.teamA, 3);
      await addPointsToPlayers(ctx, matchDoc.teamB, 1);
    } else if (args.winner === "Team B") {
      await addPointsToPlayers(ctx, matchDoc.teamB, 3);
      await addPointsToPlayers(ctx, matchDoc.teamA, 1);
    } else if (args.winner === "Draw") {
      await addPointsToPlayers(ctx, matchDoc.teamA, 2);
      await addPointsToPlayers(ctx, matchDoc.teamB, 2);
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
    return toMatchRecord(updatedMatch);
  },
});

export const getAllPayments = queryGeneric({
  handler: async (ctx): Promise<PaymentRecord[]> => {
    const payments = await listAllPayments(ctx);
    return payments.map(toPaymentRecord);
  },
});

export const getPaymentMatrix = queryGeneric({
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

export const markPaymentPaid = mutationGeneric({
  args: {
    playerId: v.number(),
    matchId: v.number(),
    paid: v.boolean(),
  },
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

export const markAllPaymentsPaidForPlayer = mutationGeneric({
  args: { playerId: v.number() },
  handler: async (ctx, args): Promise<void> => {
    const payments = await listPaymentsByPlayer(ctx, args.playerId);
    for (const payment of payments) {
      await ctx.db.patch(payment._id, { paid: true });
    }
    await recalculatePlayerTotal(ctx, args.playerId);
  },
});

export const getLeaderboard = queryGeneric({
  handler: async (ctx): Promise<LeaderboardEntry[]> => {
    const playerRows = await listPlayersSortedByPointsDesc(ctx);
    const matches = (await listMatchesSortedByDateDesc(ctx)).filter(
      (match) => match.winner !== "Not Played"
    );

    return playerRows.map((row, index) => {
      const playerId = row.legacyId;
      const playerMatches = matches.filter(
        (match) => match.teamA.includes(playerId) || match.teamB.includes(playerId)
      );

      const matchesPlayed = playerMatches.length;
      let wins = 0;
      let draws = 0;
      let losses = 0;

      for (const match of playerMatches) {
        const isTeamA = match.teamA.includes(playerId);
        if (match.winner === "Draw") {
          draws += 1;
        } else if (
          (match.winner === "Team A" && isTeamA) ||
          (match.winner === "Team B" && !isTeamA)
        ) {
          wins += 1;
        } else {
          losses += 1;
        }
      }

      const avgPointsPerMatch =
        matchesPlayed > 0 ? Math.round((row.points / matchesPlayed) * 10) / 10 : 0;

      const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

      const lastPlayedMatch = playerMatches[0];
      const lastPlayedDate = lastPlayedMatch ? lastPlayedMatch.date : null;

      const form: FormResult[] = playerMatches
        .slice(0, 5)
        .map((match) => {
          const isTeamA = match.teamA.includes(playerId);
          if (match.winner === "Draw") {
            return "D";
          }
          if (
            (match.winner === "Team A" && isTeamA) ||
            (match.winner === "Team B" && !isTeamA)
          ) {
            return "W";
          }
          return "L";
        })
        .reverse();

      return {
        rank: index + 1,
        playerId,
        name: row.name,
        points: row.points,
        matchesPlayed,
        avgPointsPerMatch,
        lastPlayedDate,
        winRate,
        wins,
        draws,
        losses,
        form,
      };
    });
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
  const docs = (await ctx.db.query(tableName).collect()) as Array<{ _id: any }>;
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

export const importSnapshot = mutationGeneric({
  args: {
    players: v.array(importedPlayerValidator),
    matches: v.array(importedMatchValidator),
    payments: v.array(importedPaymentValidator),
  },
  handler: async (ctx, args) => {
    await clearTable(ctx, "payments");
    await clearTable(ctx, "matches");
    await clearTable(ctx, "players");
    await clearTable(ctx, "metadata");

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
      });
    }

    let maxMatchId = 0;
    for (const match of args.matches) {
      maxMatchId = Math.max(maxMatchId, match.id);
      await ctx.db.insert("matches", {
        legacyId: match.id,
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

    return {
      imported: {
        players: args.players.length,
        matches: args.matches.length,
        payments: args.payments.length,
      },
    };
  },
});
