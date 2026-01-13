import { NextResponse } from "next/server";
import { assignTeams } from "@/lib/queries";
import type { AssignTeamsInput } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const body = await request.json();

    if (!Array.isArray(body.teamA) || !Array.isArray(body.teamB)) {
      return NextResponse.json(
        { error: "teamA and teamB must be arrays of player IDs" },
        { status: 400 }
      );
    }

    const teamA = body.teamA.filter((id: unknown) => typeof id === "number");
    const teamB = body.teamB.filter((id: unknown) => typeof id === "number");

    const input: AssignTeamsInput = { teamA, teamB };

    const match = assignTeams(matchId, input);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to assign teams";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
