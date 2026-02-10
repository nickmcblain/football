import { NextResponse } from "next/server";
import { setMatchWinner } from "@/lib/queries";
import type { Winner } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const body = await request.json();

    const validWinners: Winner[] = ["Team A", "Team B", "Draw", "Not Played"];
    if (!body.winner || !validWinners.includes(body.winner)) {
      return NextResponse.json(
        { error: "Winner must be 'Team A', 'Team B', 'Draw', or 'Not Played'" },
        { status: 400 }
      );
    }

    const match = await setMatchWinner(matchId, body.winner);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to set winner";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
