import { NextResponse } from "next/server";
import { getPaymentMatrix } from "@/lib/queries";

export async function GET() {
  try {
    const matrix = getPaymentMatrix();
    return NextResponse.json(matrix);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
