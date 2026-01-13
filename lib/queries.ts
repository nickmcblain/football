import { getDb, transaction } from "./db";
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
  FormResult,
} from "./types";

interface PlayerRow {
  id: number;
  name: string;
  position: string;
  points: number;
  total_owed: number;
  paid: number;
}

function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    name: row.name,
    position: row.position as Position,
    points: row.points,
    totalOwed: row.total_owed,
    paid: row.paid === 1,
  };
}

export function getAllPlayers(): Player[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM players ORDER BY name").all() as PlayerRow[];
  return rows.map(rowToPlayer);
}

export function getPlayerById(id: number): Player | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM players WHERE id = ?").get(id) as PlayerRow | undefined;
  return row ? rowToPlayer(row) : null;
}

export function createPlayer(input: CreatePlayerInput): Player {
  const db = getDb();
  const stmt = db.prepare("INSERT INTO players (name, position) VALUES (?, ?)");
  const result = stmt.run(input.name, input.position);
  return getPlayerById(Number(result.lastInsertRowid))!;
}

export function updatePlayer(id: number, input: UpdatePlayerInput): Player | null {
  const db = getDb();
  const player = getPlayerById(id);
  if (!player) return null;

  const name = input.name ?? player.name;
  const position = input.position ?? player.position;

  db.prepare("UPDATE players SET name = ?, position = ? WHERE id = ?").run(name, position, id);
  return getPlayerById(id);
}

export function deletePlayer(id: number): boolean {
  return transaction(() => {
    const db = getDb();
    
    const matches = getAllMatches();
    for (const match of matches) {
      const inTeamA = match.teamA.includes(id);
      const inTeamB = match.teamB.includes(id);
      if (inTeamA || inTeamB) {
        const newTeamA = match.teamA.filter((pid) => pid !== id);
        const newTeamB = match.teamB.filter((pid) => pid !== id);
        db.prepare("UPDATE matches SET team_a = ?, team_b = ? WHERE id = ?")
          .run(JSON.stringify(newTeamA), JSON.stringify(newTeamB), match.id);
        if (match.winner !== "Not Played") {
          recalculateMatchPayments(match.id);
        }
      }
    }

    const result = db.prepare("DELETE FROM players WHERE id = ?").run(id);
    return result.changes > 0;
  });
}

interface MatchRow {
  id: number;
  date: string;
  time: string;
  price: number;
  location: string;
  pitch: string;
  team_a: string;
  team_b: string;
  winner: string;
}

function rowToMatch(row: MatchRow): Match {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    price: row.price,
    location: row.location,
    pitch: row.pitch,
    teamA: JSON.parse(row.team_a) as number[],
    teamB: JSON.parse(row.team_b) as number[],
    winner: row.winner as Winner,
  };
}

export function getAllMatches(): Match[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM matches ORDER BY date DESC").all() as MatchRow[];
  return rows.map(rowToMatch);
}

export function getMatchById(id: number): Match | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM matches WHERE id = ?").get(id) as MatchRow | undefined;
  return row ? rowToMatch(row) : null;
}

export function createMatch(input: CreateMatchInput): Match {
  const db = getDb();
  const location = input.location ?? "";
  const pitch = input.pitch ?? "";
  const stmt = db.prepare("INSERT INTO matches (date, time, price, location, pitch) VALUES (?, ?, ?, ?, ?)");
  const result = stmt.run(input.date, input.time, input.price, location, pitch);
  return getMatchById(Number(result.lastInsertRowid))!;
}

export function updateMatch(id: number, input: UpdateMatchInput): Match | null {
  const db = getDb();
  const match = getMatchById(id);
  if (!match) return null;

  const date = input.date ?? match.date;
  const time = input.time ?? match.time;
  const price = input.price ?? match.price;
  const location = input.location ?? match.location;
  const pitch = input.pitch ?? match.pitch;

  db.prepare("UPDATE matches SET date = ?, time = ?, price = ?, location = ?, pitch = ? WHERE id = ?")
    .run(date, time, price, location, pitch, id);

  if (input.price !== undefined && match.winner !== "Not Played") {
    recalculateMatchPayments(id);
  }

  return getMatchById(id);
}

export function deleteMatch(id: number): boolean {
  return transaction(() => {
    const db = getDb();
    const match = getMatchById(id);
    if (!match) return false;

    if (match.winner === "Team A") {
      removePointsFromPlayers(match.teamA, 3);
      removePointsFromPlayers(match.teamB, 1);
    } else if (match.winner === "Team B") {
      removePointsFromPlayers(match.teamB, 3);
      removePointsFromPlayers(match.teamA, 1);
    } else if (match.winner === "Draw") {
      removePointsFromPlayers(match.teamA, 2);
      removePointsFromPlayers(match.teamB, 2);
    }

    const result = db.prepare("DELETE FROM matches WHERE id = ?").run(id);

    recalculateAllPlayerTotals();

    return result.changes > 0;
  });
}

export function assignTeams(matchId: number, input: AssignTeamsInput): Match | null {
  return transaction(() => {
    const db = getDb();
    const match = getMatchById(matchId);
    if (!match) return null;

    const overlap = input.teamA.filter((id) => input.teamB.includes(id));
    if (overlap.length > 0) {
      throw new Error("Players cannot be on both teams");
    }



    const allPlayerIds = [...input.teamA, ...input.teamB];
    for (const playerId of allPlayerIds) {
      if (!getPlayerById(playerId)) {
        throw new Error(`Player with ID ${playerId} not found`);
      }
    }

    if (match.winner !== "Not Played") {
      if (match.winner === "Team A") {
        removePointsFromPlayers(match.teamA, 3);
        removePointsFromPlayers(match.teamB, 1);
      } else if (match.winner === "Team B") {
        removePointsFromPlayers(match.teamB, 3);
        removePointsFromPlayers(match.teamA, 1);
      } else if (match.winner === "Draw") {
        removePointsFromPlayers(match.teamA, 2);
        removePointsFromPlayers(match.teamB, 2);
      }

      if (match.winner === "Team A") {
        addPointsToPlayers(input.teamA, 3);
        addPointsToPlayers(input.teamB, 1);
      } else if (match.winner === "Team B") {
        addPointsToPlayers(input.teamB, 3);
        addPointsToPlayers(input.teamA, 1);
      } else if (match.winner === "Draw") {
        addPointsToPlayers(input.teamA, 2);
        addPointsToPlayers(input.teamB, 2);
      }
    }

    db.prepare("UPDATE matches SET team_a = ?, team_b = ? WHERE id = ?")
      .run(JSON.stringify(input.teamA), JSON.stringify(input.teamB), matchId);

    if (match.winner !== "Not Played") {
      recalculateMatchPayments(matchId);
    }

    return getMatchById(matchId);
  });
}

export function setMatchWinner(matchId: number, winner: Winner): Match | null {
  return transaction(() => {
    const db = getDb();
    const match = getMatchById(matchId);
    if (!match) return null;

    const hasTeams = match.teamA.length > 0 || match.teamB.length > 0;
    if (!hasTeams && winner !== "Not Played") {
      throw new Error("Cannot set winner without teams assigned");
    }

    const oldWinner = match.winner;

    if (oldWinner === "Team A") {
      removePointsFromPlayers(match.teamA, 3);
      removePointsFromPlayers(match.teamB, 1);
    } else if (oldWinner === "Team B") {
      removePointsFromPlayers(match.teamB, 3);
      removePointsFromPlayers(match.teamA, 1);
    } else if (oldWinner === "Draw") {
      removePointsFromPlayers(match.teamA, 2);
      removePointsFromPlayers(match.teamB, 2);
    }

    if (winner === "Team A") {
      addPointsToPlayers(match.teamA, 3);
      addPointsToPlayers(match.teamB, 1);
    } else if (winner === "Team B") {
      addPointsToPlayers(match.teamB, 3);
      addPointsToPlayers(match.teamA, 1);
    } else if (winner === "Draw") {
      addPointsToPlayers(match.teamA, 2);
      addPointsToPlayers(match.teamB, 2);
    }

    db.prepare("UPDATE matches SET winner = ? WHERE id = ?").run(winner, matchId);

    if (winner === "Not Played") {
      db.prepare("DELETE FROM payments WHERE match_id = ?").run(matchId);
    } else {
      recalculateMatchPayments(matchId);
    }

    recalculateAllPlayerTotals();

    return getMatchById(matchId);
  });
}

interface PaymentRow {
  id: number;
  player_id: number;
  match_id: number;
  amount_owed: number;
  paid: number;
}

function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    playerId: row.player_id,
    matchId: row.match_id,
    amountOwed: row.amount_owed,
    paid: row.paid === 1,
  };
}

export function getPaymentsByMatch(matchId: number): Payment[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM payments WHERE match_id = ?").all(matchId) as PaymentRow[];
  return rows.map(rowToPayment);
}

export function getPaymentsByPlayer(playerId: number): Payment[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM payments WHERE player_id = ?").all(playerId) as PaymentRow[];
  return rows.map(rowToPayment);
}

export function getAllPayments(): Payment[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM payments").all() as PaymentRow[];
  return rows.map(rowToPayment);
}

export function markPaymentPaid(playerId: number, matchId: number, paid: boolean): Payment | null {
  return transaction(() => {
    const db = getDb();
    db.prepare("UPDATE payments SET paid = ? WHERE player_id = ? AND match_id = ?")
      .run(paid ? 1 : 0, playerId, matchId);

    recalculatePlayerTotal(playerId);

    const row = db.prepare("SELECT * FROM payments WHERE player_id = ? AND match_id = ?")
      .get(playerId, matchId) as PaymentRow | undefined;

    return row ? rowToPayment(row) : null;
  });
}

export function markAllPaymentsPaidForPlayer(playerId: number): void {
  transaction(() => {
    const db = getDb();
    db.prepare("UPDATE payments SET paid = 1 WHERE player_id = ?").run(playerId);
    recalculatePlayerTotal(playerId);
  });
}

export function getLeaderboard(): LeaderboardEntry[] {
  const db = getDb();
  const playerRows = db.prepare("SELECT * FROM players ORDER BY points DESC, name ASC").all() as PlayerRow[];
  const matches = getAllMatches().filter((m) => m.winner !== "Not Played");

  return playerRows.map((row: PlayerRow, index: number) => {
    const playerId = row.id;

    const playerMatches = matches.filter(
      (m) => m.teamA.includes(playerId) || m.teamB.includes(playerId)
    );

    const matchesPlayed = playerMatches.length;

    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const match of playerMatches) {
      const isTeamA = match.teamA.includes(playerId);
      if (match.winner === "Draw") {
        draws++;
      } else if (
        (match.winner === "Team A" && isTeamA) ||
        (match.winner === "Team B" && !isTeamA)
      ) {
        wins++;
      } else {
        losses++;
      }
    }

    const avgPointsPerMatch = matchesPlayed > 0
      ? Math.round((row.points / matchesPlayed) * 10) / 10
      : 0;

    const winRate = matchesPlayed > 0
      ? Math.round((wins / matchesPlayed) * 100)
      : 0;

    const lastPlayedMatch = playerMatches[0];
    const lastPlayedDate = lastPlayedMatch ? lastPlayedMatch.date : null;

    const form: FormResult[] = playerMatches.slice(0, 5).map((match) => {
      const isTeamA = match.teamA.includes(playerId);
      if (match.winner === "Draw") return "D";
      if (
        (match.winner === "Team A" && isTeamA) ||
        (match.winner === "Team B" && !isTeamA)
      ) {
        return "W";
      }
      return "L";
    }).reverse();

    return {
      rank: index + 1,
      playerId: row.id,
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
}

export function getPaymentMatrix(): PaymentMatrix {
  const players = getAllPlayers().map((p) => ({ id: p.id, name: p.name }));
  const matches = getAllMatches()
    .filter((m) => m.winner !== "Not Played")
    .map((m) => ({ id: m.id, date: m.date, time: m.time, price: m.price }));

  const allPayments = getAllPayments();
  const payments = allPayments.map((p) => ({
    playerId: p.playerId,
    matchId: p.matchId,
    amountOwed: p.amountOwed,
    paid: p.paid,
  }));

  const totals = players.map((player) => {
    const playerPayments = allPayments.filter(
      (p) => p.playerId === player.id && !p.paid
    );
    const totalOwed = playerPayments.reduce((sum, p) => sum + p.amountOwed, 0);
    return { playerId: player.id, totalOwed };
  });

  return { players, matches, payments, totals };
}

function addPointsToPlayers(playerIds: number[], points: number): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE players SET points = points + ? WHERE id = ?");
  for (const id of playerIds) {
    stmt.run(points, id);
  }
}

function removePointsFromPlayers(playerIds: number[], points: number): void {
  const db = getDb();
  const stmt = db.prepare("UPDATE players SET points = MAX(0, points - ?) WHERE id = ?");
  for (const id of playerIds) {
    stmt.run(points, id);
  }
}

function recalculateMatchPayments(matchId: number): void {
  const db = getDb();
  const match = getMatchById(matchId);
  if (!match || match.winner === "Not Played") return;

  const attendees = [...match.teamA, ...match.teamB];
  if (attendees.length === 0) return;

  const amountPerPerson = match.price / attendees.length;

  db.prepare("DELETE FROM payments WHERE match_id = ?").run(matchId);

  const stmt = db.prepare(
    "INSERT INTO payments (player_id, match_id, amount_owed, paid) VALUES (?, ?, ?, 0)"
  );
  for (const playerId of attendees) {
    stmt.run(playerId, matchId, amountPerPerson);
  }
}

function recalculatePlayerTotal(playerId: number): void {
  const db = getDb();
  const result = db.prepare(
    "SELECT COALESCE(SUM(amount_owed), 0) as total FROM payments WHERE player_id = ? AND paid = 0"
  ).get(playerId) as { total: number };

  const totalOwed = result?.total ?? 0;
  const allPaid = totalOwed === 0;

  db.prepare("UPDATE players SET total_owed = ?, paid = ? WHERE id = ?")
    .run(totalOwed, allPaid ? 1 : 0, playerId);
}

function recalculateAllPlayerTotals(): void {
  const players = getAllPlayers();
  for (const player of players) {
    recalculatePlayerTotal(player.id);
  }
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

export function randomizeTeams(input: RandomizeTeamsInput): RandomizeTeamsResult {
  const { playerIds, lockedTeamA = [], lockedTeamB = [] } = input;

  if (playerIds.length === 0) {
    return { teamA: [...lockedTeamA], teamB: [...lockedTeamB] };
  }

  const lockedSet = new Set([...lockedTeamA, ...lockedTeamB]);
  const unassignedIds = playerIds.filter((id) => !lockedSet.has(id));

  const unassignedPlayers = unassignedIds
    .map((id) => getPlayerById(id))
    .filter((p): p is Player => p !== null);

  const byPosition: Record<Position, Player[]> = {
    Attack: [],
    Midfield: [],
    Defense: [],
  };

  for (const player of unassignedPlayers) {
    byPosition[player.position].push(player);
  }

  for (const position of Object.keys(byPosition) as Position[]) {
    byPosition[position] = shuffle(byPosition[position]);
  }

  const teamA: number[] = [...lockedTeamA];
  const teamB: number[] = [...lockedTeamB];

  for (const position of ["Defense", "Midfield", "Attack"] as Position[]) {
    const positionPlayers = byPosition[position];
    for (let i = 0; i < positionPlayers.length; i++) {
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
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
