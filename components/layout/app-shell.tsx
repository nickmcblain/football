"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";

const SIDEBAR_HIDDEN_PATHS = ["/leaderboard", "/wrapped", "/login"];

function shouldHideSidebar(pathname: string) {
  return SIDEBAR_HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = shouldHideSidebar(pathname);
  const isWrapped = pathname.startsWith("/wrapped");

  return (
    <>
      {!hideSidebar && <AppSidebar />}
      <main
        className={
          isWrapped
            ? "min-h-screen bg-[#0e0d0a] p-3 sm:p-8"
            : hideSidebar
              ? "min-h-screen p-4 sm:p-8"
              : "min-h-screen px-4 pb-8 pt-20 md:ml-64 md:p-8"
        }
      >
        {children}
      </main>
    </>
  );
}
