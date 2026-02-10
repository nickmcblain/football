import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getConfiguredPassword,
  getExpectedAuthToken,
  isAuthEnabled,
} from "@/lib/auth";

type LoginBody = {
  password?: string;
};

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return NextResponse.json(
      { error: "Password protection is disabled. Set BOMBERS_FC_PASSWORD to enable it." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as LoginBody;
  const providedPassword = body.password ?? "";
  const configuredPassword = getConfiguredPassword();

  if (providedPassword !== configuredPassword) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await getExpectedAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Unable to create auth token" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
