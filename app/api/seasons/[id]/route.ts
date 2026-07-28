import { NextResponse } from "next/server";
import { updateSeason } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const seasonId = Number(id);
    if (!Number.isInteger(seasonId)) {
      return NextResponse.json({ error: "Invalid season ID" }, { status: 400 });
    }
    const body = await request.json();
    const season = await updateSeason(seasonId, {
      name: typeof body.name === "string" ? body.name : undefined,
      startDate: typeof body.startDate === "string" ? body.startDate : undefined,
      endDate: typeof body.endDate === "string" ? body.endDate : undefined,
    });
    if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });
    return NextResponse.json(season);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update season" },
      { status: 400 },
    );
  }
}
