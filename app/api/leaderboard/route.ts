import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const season = new URL(request.url).searchParams.get("season") ?? undefined;
    const leaderboard = await getLeaderboard(season);
    return NextResponse.json(leaderboard);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
