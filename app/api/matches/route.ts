import { NextResponse } from "next/server";
import { getAllMatches, createMatch } from "@/lib/queries";
import type { CreateMatchInput } from "@/lib/types";

export async function GET() {
  try {
    const matches = await getAllMatches();
    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.date || typeof body.date !== "string") {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    if (!body.time || typeof body.time !== "string") {
      return NextResponse.json({ error: "Time is required" }, { status: 400 });
    }

    if (typeof body.price !== "number" || body.price < 0) {
      return NextResponse.json({ error: "Price must be a non-negative number" }, { status: 400 });
    }

    const input: CreateMatchInput = {
      date: body.date,
      time: body.time,
      price: body.price,
      location: typeof body.location === "string" ? body.location : undefined,
      pitch: typeof body.pitch === "string" ? body.pitch : undefined,
    };

    const match = await createMatch(input);
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create match" },
      { status: 500 }
    );
  }
}
