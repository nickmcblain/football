import { NextResponse } from "next/server";
import { getAllMatches, getAllPlayers } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const seasonParam = new URL(request.url).searchParams.get("seasonId");
    const seasonId = seasonParam ? Number(seasonParam) : undefined;
    const [matches, players] = await Promise.all([
      getAllMatches(Number.isFinite(seasonId) ? seasonId : undefined),
      getAllPlayers(),
    ]);
    const names = new Map(players.map((player) => [player.id, player.name]));
    const lineup = (ids: number[]) =>
      ids
        .map((id) => ({ id, name: names.get(id) ?? `Player ${id}` }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(
      matches.map((match) => ({
        id: match.id,
        date: match.date,
        time: match.time,
        location: match.location,
        pitch: match.pitch,
        winner: match.winner,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        teamA: lineup(match.teamA),
        teamB: lineup(match.teamB),
      })),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch matches" },
      { status: 500 },
    );
  }
}
