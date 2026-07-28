import { NextResponse } from "next/server";
import { getRoundup } from "@/lib/queries";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const roundup = await getRoundup(slug);
    if (!roundup) {
      return NextResponse.json({ error: "Roundup not found" }, { status: 404 });
    }
    return NextResponse.json(roundup);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch roundup" },
      { status: 500 },
    );
  }
}
