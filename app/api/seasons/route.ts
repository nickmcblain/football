import { NextResponse } from "next/server";
import { createSeason, getSeasons } from "@/lib/queries";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (
      typeof body.name !== "string" ||
      typeof body.startDate !== "string" ||
      typeof body.endDate !== "string"
    ) {
      return NextResponse.json(
        { error: "Name, start date, and end date are required" },
        { status: 400 },
      );
    }
    const season = await createSeason({
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
    });
    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create season" },
      { status: 400 },
    );
  }
}
