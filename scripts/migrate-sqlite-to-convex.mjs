import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const api = anyApi;
const initialEnvKeys = new Set(Object.keys(process.env));

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const withoutExport = trimmed.startsWith("export ")
    ? trimmed.slice("export ".length).trim()
    : trimmed;
  const equalsIndex = withoutExport.indexOf("=");
  if (equalsIndex <= 0) {
    return null;
  }

  const key = withoutExport.slice(0, equalsIndex).trim();
  const rawValue = withoutExport.slice(equalsIndex + 1).trim();
  if (!key) {
    return null;
  }

  return { key, value: stripQuotes(rawValue) };
}

function loadEnvFile(filePath, { override }) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) {
      continue;
    }

    const { key, value } = parsed;
    if (initialEnvKeys.has(key)) {
      continue;
    }
    if (!override && process.env[key] !== undefined) {
      continue;
    }
    process.env[key] = value;
  }
}

function loadProjectEnv() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"), { override: false });
  loadEnvFile(path.join(cwd, ".env.local"), { override: true });
}

function parseIdArray(value) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => typeof item === "number");
  } catch {
    return [];
  }
}

async function run() {
  loadProjectEnv();

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing Convex URL. Set NEXT_PUBLIC_CONVEX_URL (or CONVEX_URL).");
  }

  const sqlitePathArg = process.argv[2];
  const sqlitePath = sqlitePathArg
    ? path.resolve(process.cwd(), sqlitePathArg)
    : path.join(process.cwd(), "db.sqlite");

  const db = new Database(sqlitePath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    console.log(`Reading SQLite snapshot (read-only): ${sqlitePath}`);

    const playerRows = db
      .prepare("SELECT id, name, position, points, total_owed, paid FROM players ORDER BY id")
      .all();

    const matchRows = db
      .prepare(
        "SELECT id, date, time, price, location, pitch, team_a, team_b, winner FROM matches ORDER BY id"
      )
      .all();

    const paymentRows = db
      .prepare("SELECT id, player_id, match_id, amount_owed, paid FROM payments ORDER BY id")
      .all();

    const players = playerRows.map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      points: row.points,
      totalOwed: row.total_owed,
      paid: row.paid === 1,
    }));

    const matches = matchRows.map((row) => ({
      id: row.id,
      date: row.date,
      time: row.time,
      price: row.price,
      location: row.location,
      pitch: row.pitch,
      teamA: parseIdArray(row.team_a),
      teamB: parseIdArray(row.team_b),
      winner: row.winner,
    }));

    const payments = paymentRows.map((row) => ({
      id: row.id,
      playerId: row.player_id,
      matchId: row.match_id,
      amountOwed: row.amount_owed,
      paid: row.paid === 1,
    }));

    console.log(
      `Loaded ${players.length} players, ${matches.length} matches, ${payments.length} payments from SQLite`
    );

    const client = new ConvexHttpClient(convexUrl);
    let result;
    try {
      result = await client.mutation(api.data.importSnapshot, {
        players,
        matches,
        payments,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to call Convex at ${convexUrl}. Original error: ${message}`,
        { cause: error }
      );
    }

    console.log("Convex import complete:");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration failed: ${message}`);
  if (error instanceof Error && error.cause instanceof Error) {
    console.error(`Cause: ${error.cause.message}`);
  }
  process.exit(1);
});
