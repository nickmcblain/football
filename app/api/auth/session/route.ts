import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isAuthEnabled, isValidAuthToken } from "@/lib/auth";

export async function GET() {
  if (!isAuthEnabled()) {
    return NextResponse.json({ authenticated: true });
  }

  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const authenticated = await isValidAuthToken(token);
  return NextResponse.json({ authenticated }, { status: authenticated ? 200 : 401 });
}
