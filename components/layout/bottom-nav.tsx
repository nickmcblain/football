"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBallFootball,
  IconCalendar,
  IconCash,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react";

const ITEMS = [
  { href: "/leaderboard", label: "Table", icon: IconTrophy },
  { href: "/matches", label: "Matches", icon: IconCalendar },
  { href: "/players", label: "Players", icon: IconUsers },
  { href: "/payments", label: "Payments", icon: IconCash },
  { href: "/seasons", label: "Seasons", icon: IconBallFootball },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] ${
                active ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
