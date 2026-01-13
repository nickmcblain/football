import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/queries";

export async function GET() {
  try {
    const leaderboard = getLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
