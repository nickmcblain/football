import { NextResponse } from "next/server";
import { getSeasons } from "@/lib/queries";

export async function GET() {
  try {
    return NextResponse.json(await getSeasons());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch seasons" },
      { status: 500 },
    );
  }
}
