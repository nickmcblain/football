import { NextResponse } from "next/server";
import { markPaymentPaid } from "@/lib/queries";

type Params = { params: Promise<{ playerId: string; matchId: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { playerId: playerIdStr, matchId: matchIdStr } = await params;
    const playerId = parseInt(playerIdStr, 10);
    const matchId = parseInt(matchIdStr, 10);

    if (isNaN(playerId) || isNaN(matchId)) {
      return NextResponse.json({ error: "Invalid player or match ID" }, { status: 400 });
    }

    const body = await request.json();

    if (typeof body.paid !== "boolean") {
      return NextResponse.json({ error: "paid must be a boolean" }, { status: 400 });
    }

    const payment = markPaymentPaid(playerId, matchId, body.paid);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update payment" },
      { status: 500 }
    );
  }
}
