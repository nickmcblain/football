import { NextResponse } from "next/server";
import { setMatchWinner } from "@/lib/queries";
import type { Winner } from "@/lib/types";

const validWinners: Winner[] = ["Team A", "Team B", "Draw", "Not Played"];

function readScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Scores must be whole numbers of 0 or more");
  }
  return value;
}

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const body = await request.json();

    if (!body.winner || !validWinners.includes(body.winner)) {
      return NextResponse.json(
        { error: "Winner must be 'Team A', 'Team B', 'Draw', or 'Not Played'" },
        { status: 400 }
      );
    }

    const match = await setMatchWinner(matchId, {
      winner: body.winner,
      scoreA: readScore(body.scoreA),
      scoreB: readScore(body.scoreB),
    });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set winner";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
