import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "db.sqlite");
const db = new Database(DB_PATH);

interface MatchRow {
  id: number;
  team_a: string;
  team_b: string;
  winner: string;
}

interface PlayerRow {
  id: number;
  name: string;
  points: number;
}

function recalculateAllPoints() {
  console.log("Starting points recalculation...\n");

  const players = db.prepare("SELECT id, name, points FROM players").all() as PlayerRow[];
  const matches = db
    .prepare("SELECT id, team_a, team_b, winner FROM matches WHERE winner != 'Not Played'")
    .all() as MatchRow[];

  console.log(`Found ${players.length} players and ${matches.length} completed matches\n`);

  const pointsMap = new Map<number, number>();
  players.forEach((p) => pointsMap.set(p.id, 0));

  for (const match of matches) {
    const teamA: number[] = JSON.parse(match.team_a);
    const teamB: number[] = JSON.parse(match.team_b);

    if (match.winner === "Team A") {
      teamA.forEach((id) => pointsMap.set(id, (pointsMap.get(id) || 0) + 3));
      teamB.forEach((id) => pointsMap.set(id, (pointsMap.get(id) || 0) + 1));
    } else if (match.winner === "Team B") {
      teamB.forEach((id) => pointsMap.set(id, (pointsMap.get(id) || 0) + 3));
      teamA.forEach((id) => pointsMap.set(id, (pointsMap.get(id) || 0) + 1));
    } else if (match.winner === "Draw") {
      teamA.forEach((id) => pointsMap.set(id, (pointsMap.get(id) || 0) + 2));
      teamB.forEach((id) => pointsMap.set(id, (pointsMap.get(id) || 0) + 2));
    }
  }

  const updateStmt = db.prepare("UPDATE players SET points = ? WHERE id = ?");

  console.log("Updating player points:\n");
  console.log("Name".padEnd(20) + "Old".padStart(6) + "New".padStart(6) + "  Change");
  console.log("-".repeat(42));

  for (const player of players) {
    const newPoints = pointsMap.get(player.id) || 0;
    const diff = newPoints - player.points;
    const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? "0" : `${diff}`;

    console.log(
      player.name.padEnd(20) +
        player.points.toString().padStart(6) +
        newPoints.toString().padStart(6) +
        diffStr.padStart(8)
    );

    updateStmt.run(newPoints, player.id);
  }

  console.log("\nPoints recalculation complete!");
}

recalculateAllPoints();
db.close();
