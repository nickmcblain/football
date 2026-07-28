import { NextResponse } from "next/server";
import { closeSeason } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const seasonId = Number(id);
    if (!Number.isInteger(seasonId)) {
      return NextResponse.json({ error: "Invalid season ID" }, { status: 400 });
    }
    return NextResponse.json(await closeSeason(seasonId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to close season" },
      { status: 400 },
    );
  }
}
