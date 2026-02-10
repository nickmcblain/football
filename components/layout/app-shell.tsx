"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";

const SIDEBAR_HIDDEN_PATHS = ["/leaderboard", "/login"];

function shouldHideSidebar(pathname: string) {
  return SIDEBAR_HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideSidebar = shouldHideSidebar(pathname);

  return (
    <>
      {!hideSidebar && <AppSidebar />}
      <main className={hideSidebar ? "min-h-screen p-8" : "ml-64 min-h-screen p-8"}>{children}</main>
    </>
  );
}
