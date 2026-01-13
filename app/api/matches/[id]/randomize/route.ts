import { NextResponse } from "next/server";
import { randomizeTeams, assignTeams, getMatchById } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const match = getMatchById(matchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const body = await request.json();

    if (!Array.isArray(body.attendees)) {
      return NextResponse.json(
        { error: "attendees must be an array of player IDs" },
        { status: 400 }
      );
    }

    const attendees = body.attendees.filter((id: unknown) => typeof id === "number");
    const lockedTeamA = Array.isArray(body.teamA)
      ? body.teamA.filter((id: unknown) => typeof id === "number")
      : [];
    const lockedTeamB = Array.isArray(body.teamB)
      ? body.teamB.filter((id: unknown) => typeof id === "number")
      : [];

    if (attendees.length < 2) {
      return NextResponse.json(
        { error: "At least 2 players required for team randomization" },
        { status: 400 }
      );
    }

    const { teamA, teamB } = randomizeTeams({
      playerIds: attendees,
      lockedTeamA,
      lockedTeamB,
    });

    const updatedMatch = assignTeams(matchId, { teamA, teamB });
    if (!updatedMatch) {
      return NextResponse.json({ error: "Failed to assign teams" }, { status: 500 });
    }

    return NextResponse.json(updatedMatch);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to randomize teams";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
