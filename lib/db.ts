import Database from "better-sqlite3";
import path from "path";

let db: Database.Database | null = null;

const DB_PATH = path.join(process.cwd(), "db.sqlite");

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      position TEXT NOT NULL CHECK(position IN ('Attack', 'Midfield', 'Defense')),
      points INTEGER DEFAULT 0,
      total_owed REAL DEFAULT 0.0,
      paid INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      time TEXT NOT NULL DEFAULT '19:00',
      price REAL NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      pitch TEXT NOT NULL DEFAULT '',
      team_a TEXT NOT NULL DEFAULT '[]',
      team_b TEXT NOT NULL DEFAULT '[]',
      winner TEXT DEFAULT 'Not Played' CHECK(winner IN ('Team A', 'Team B', 'Draw', 'Not Played'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      amount_owed REAL NOT NULL,
      paid INTEGER DEFAULT 0,
      FOREIGN KEY(player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
      UNIQUE(player_id, match_id)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_player ON payments(player_id);
    CREATE INDEX IF NOT EXISTS idx_payments_match ON payments(match_id);
  `);

  // Migration: rename wins column to points if it exists (for existing databases)
  const columns = database.pragma("table_info(players)") as { name: string }[];
  const hasWinsColumn = columns.some((col) => col.name === "wins");
  const hasPointsColumn = columns.some((col) => col.name === "points");
  
  if (hasWinsColumn && !hasPointsColumn) {
    database.exec(`ALTER TABLE players RENAME COLUMN wins TO points`);
    database.exec(`DROP INDEX IF EXISTS idx_players_wins`);
  }

  database.exec(`CREATE INDEX IF NOT EXISTS idx_players_points ON players(points DESC)`);

  // Migration: add time column to matches if it doesn't exist
  const matchColumns = database.pragma("table_info(matches)") as { name: string }[];
  const hasTimeColumn = matchColumns.some((col) => col.name === "time");
  
  if (!hasTimeColumn) {
    database.exec(`ALTER TABLE matches ADD COLUMN time TEXT NOT NULL DEFAULT '19:00'`);
  }

  // Migration: add location and pitch columns to matches if they don't exist
  const updatedMatchColumns = database.pragma("table_info(matches)") as { name: string }[];
  const hasLocationColumn = updatedMatchColumns.some((col) => col.name === "location");
  const hasPitchColumn = updatedMatchColumns.some((col) => col.name === "pitch");
  
  if (!hasLocationColumn) {
    database.exec(`ALTER TABLE matches ADD COLUMN location TEXT NOT NULL DEFAULT ''`);
  }
  if (!hasPitchColumn) {
    database.exec(`ALTER TABLE matches ADD COLUMN pitch TEXT NOT NULL DEFAULT ''`);
  }
}

export function transaction<T>(fn: () => T): T {
  const database = getDb();
  const runTransaction = database.transaction(fn);
  return runTransaction();
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
