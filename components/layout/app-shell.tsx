"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/bottom-nav";

function isWrapped(pathname: string) {
  return pathname === "/wrapped" || pathname.startsWith("/wrapped/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wrapped = isWrapped(pathname);
  const login = pathname === "/login";
  const leaderboard = pathname === "/leaderboard";
  const showNav = !wrapped && !login;

  return (
    <>
      <main
        className={
          wrapped
            ? "min-h-screen bg-[#0e0d0a] p-3 sm:p-8"
            : login
              ? "min-h-screen"
              : leaderboard
                ? "min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
                : "mx-auto min-h-screen w-full max-w-5xl px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-6"
        }
      >
        {children}
      </main>
      {showNav && <BottomNav />}
    </>
  );
}
