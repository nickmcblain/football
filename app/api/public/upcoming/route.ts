import { NextResponse } from "next/server";
import { getUpcomingFixture } from "@/lib/queries";

export async function GET() {
  try {
    return NextResponse.json(await getUpcomingFixture());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch the upcoming game" },
      { status: 500 },
    );
  }
}
