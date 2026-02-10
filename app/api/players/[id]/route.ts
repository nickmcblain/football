import { NextResponse } from "next/server";
import { getPlayerById, updatePlayer, deletePlayer } from "@/lib/queries";
import type { UpdatePlayerInput, Position } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    if (isNaN(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const player = await getPlayerById(playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch player" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    if (isNaN(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const body = await request.json();
    const input: UpdatePlayerInput = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim() === "") {
        return NextResponse.json({ error: "Name must be a non-empty string" }, { status: 400 });
      }
      input.name = body.name.trim();
    }

    if (body.position !== undefined) {
      const validPositions: Position[] = ["Attack", "Midfield", "Defense"];
      if (!validPositions.includes(body.position)) {
        return NextResponse.json(
          { error: "Position must be Attack, Midfield, or Defense" },
          { status: 400 }
        );
      }
      input.position = body.position;
    }

    const player = await updatePlayer(playerId, input);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update player";
    const status = message.includes("UNIQUE") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);
    if (isNaN(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const deleted = await deletePlayer(playerId);
    if (!deleted) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete player" },
      { status: 500 }
    );
  }
}
