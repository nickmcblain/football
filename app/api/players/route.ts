import { NextResponse } from "next/server";
import { getAllPlayers, createPlayer } from "@/lib/queries";
import type { CreatePlayerInput, Position } from "@/lib/types";

export async function GET() {
  try {
    const players = getAllPlayers();
    return NextResponse.json(players);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch players" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    
    const validPositions: Position[] = ["Attack", "Midfield", "Defense"];
    if (!body.position || !validPositions.includes(body.position)) {
      return NextResponse.json(
        { error: "Position must be Attack, Midfield, or Defense" },
        { status: 400 }
      );
    }

    const input: CreatePlayerInput = {
      name: body.name.trim(),
      position: body.position,
    };

    const player = createPlayer(input);
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create player";
    const status = message.includes("UNIQUE") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
