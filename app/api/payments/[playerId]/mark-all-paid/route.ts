import { NextResponse } from "next/server";
import { markAllPaymentsPaidForPlayer, getPlayerById } from "@/lib/queries";

type Params = { params: Promise<{ playerId: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { playerId: playerIdStr } = await params;
    const playerId = parseInt(playerIdStr, 10);

    if (isNaN(playerId)) {
      return NextResponse.json({ error: "Invalid player ID" }, { status: 400 });
    }

    const player = getPlayerById(playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    markAllPaymentsPaidForPlayer(playerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark payments as paid" },
      { status: 500 }
    );
  }
}
