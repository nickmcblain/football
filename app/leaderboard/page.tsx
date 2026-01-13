"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { LeaderboardEntry, FormResult } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard")
      if (!res.ok) throw new Error("Failed to fetch leaderboard")
      const data = await res.json()
      setLeaderboard(data)
    } catch {
      toast.error("Failed to load leaderboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  function getRankDisplay(rank: number) {
    if (rank === 1) return "1st"
    if (rank === 2) return "2nd"
    if (rank === 3) return "3rd"
    return `${rank}th`
  }

  function getRankStyle(rank: number) {
    if (rank === 1) return "bg-yellow-500 text-yellow-950"
    if (rank === 2) return "bg-gray-400 text-gray-950"
    if (rank === 3) return "bg-amber-700 text-amber-50"
    return ""
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  function getFormStyle(result: FormResult) {
    if (result === "W") return "bg-green-600 text-white"
    if (result === "D") return "bg-gray-400 text-white"
    return "bg-red-600 text-white"
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Player rankings by points</p>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Matches</TableHead>
              <TableHead className="text-center">Points</TableHead>
              <TableHead className="text-center">Avg. PPM</TableHead>
              <TableHead className="text-center">Last Played</TableHead>
              <TableHead className="text-center">Win Rate</TableHead>
              <TableHead className="text-center">W/D/L</TableHead>
              <TableHead className="text-center">Form</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : leaderboard.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No players yet. Add players and play some matches!
                </TableCell>
              </TableRow>
            ) : (
              leaderboard.map((entry) => (
                <TableRow key={entry.playerId}>
                  <TableCell>
                    <Badge className={getRankStyle(entry.rank)}>
                      {getRankDisplay(entry.rank)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell className="text-center">{entry.matchesPlayed}</TableCell>
                  <TableCell className="text-center font-bold">{entry.points}</TableCell>
                  <TableCell className="text-center">{entry.avgPointsPerMatch.toFixed(1)}</TableCell>
                  <TableCell className="text-center">{formatDate(entry.lastPlayedDate)}</TableCell>
                  <TableCell className="text-center">{entry.winRate}%</TableCell>
                  <TableCell className="text-center">
                    <span className="text-green-600">{entry.wins}</span>
                    {" / "}
                    <span className="text-muted-foreground">{entry.draws}</span>
                    {" / "}
                    <span className="text-red-600">{entry.losses}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-1 justify-center">
                      {entry.form.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        entry.form.map((result, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${getFormStyle(result)}`}
                          >
                            {result}
                          </span>
                        ))
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
