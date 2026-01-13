import { NextResponse } from "next/server";
import { getMatchById, updateMatch, deleteMatch } from "@/lib/queries";
import type { UpdateMatchInput } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
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

    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch match" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const body = await request.json();
    const input: UpdateMatchInput = {};

    if (body.date !== undefined) {
      if (typeof body.date !== "string") {
        return NextResponse.json({ error: "Date must be a string" }, { status: 400 });
      }
      input.date = body.date;
    }

    if (body.time !== undefined) {
      if (typeof body.time !== "string") {
        return NextResponse.json({ error: "Time must be a string" }, { status: 400 });
      }
      input.time = body.time;
    }

    if (body.price !== undefined) {
      if (typeof body.price !== "number" || body.price < 0) {
        return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
      }
      input.price = body.price;
    }

    if (body.location !== undefined) {
      if (typeof body.location !== "string") {
        return NextResponse.json({ error: "Location must be a string" }, { status: 400 });
      }
      input.location = body.location;
    }

    if (body.pitch !== undefined) {
      if (typeof body.pitch !== "string") {
        return NextResponse.json({ error: "Pitch must be a string" }, { status: 400 });
      }
      input.pitch = body.pitch;
    }

    const match = updateMatch(matchId, input);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update match" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const matchId = parseInt(id, 10);
    if (isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid match ID" }, { status: 400 });
    }

    const deleted = deleteMatch(matchId);
    if (!deleted) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete match" },
      { status: 500 }
    );
  }
}
