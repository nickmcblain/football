"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconUsers, IconBallFootball, IconTrophy, IconCash } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/players", label: "Players", icon: IconUsers },
  { href: "/matches", label: "Matches", icon: IconBallFootball },
  { href: "/leaderboard", label: "Leaderboard", icon: IconTrophy },
  { href: "/payments", label: "Payments", icon: IconCash },
]

export function AppSidebar() {
  const pathname = usePathname()
  
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-bold">Bombers FC</h1>
      </div>
      <nav className="space-y-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
