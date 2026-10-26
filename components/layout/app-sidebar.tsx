"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconCalendarStats, IconCash, IconBallFootball, IconMenu2, IconTrophy, IconUsers, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/players", label: "Players", icon: IconUsers },
  { href: "/matches", label: "Matches", icon: IconBallFootball },
  { href: "/seasons", label: "Seasons", icon: IconCalendarStats },
  { href: "/leaderboard", label: "Leaderboard", icon: IconTrophy },
  { href: "/payments", label: "Payments", icon: IconCash },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-3 md:hidden">
        <Button variant="ghost" size="icon" className="size-11" onClick={() => setOpen(true)} aria-label="Open menu">
          <IconMenu2 className="size-5" />
        </Button>
        <span className="text-base font-bold">Bombers FC</span>
      </div>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 border-r bg-background transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-lg font-bold">Bombers FC</h1>
          <Button variant="ghost" size="icon" className="size-11 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <IconX className="size-5" />
          </Button>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors md:py-2",
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
    </>
  )
}
