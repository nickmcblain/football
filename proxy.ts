import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAuthEnabled, isValidAuthToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/leaderboard", "/login"];
const PUBLIC_API_PATHS = ["/api/leaderboard", "/api/auth/login"];

function isStaticAsset(pathname: string) {
  return /\.[^/]+$/.test(pathname);
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  if (isStaticAsset(pathname) || isPublicPath(pathname) || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = await isValidAuthToken(token);

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
