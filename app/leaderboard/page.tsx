"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowUpRight, IconBallFootball, IconSparkles } from "@tabler/icons-react";
import { toast } from "sonner";
import type { FormResult, LeaderboardEntry, Season } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSeasons() {
      try {
        const response = await fetch("/api/public/seasons");
        if (!response.ok) throw new Error("Failed to fetch seasons");
        const data: Season[] = await response.json();
        setSeasons(data);
        const preferred = data.find((season) => season.status === "active") ?? data[0];
        setSelectedSeason(preferred?.slug ?? "all-time");
      } catch {
        setSelectedSeason("all-time");
      }
    }
    loadSeasons();
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    async function loadLeaderboard() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/leaderboard?season=${encodeURIComponent(selectedSeason)}`,
        );
        if (!response.ok) throw new Error("Failed to fetch leaderboard");
        setLeaderboard(await response.json());
      } catch {
        toast.error("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [selectedSeason]);

  const selectedSeasonRecord = seasons.find((season) => season.slug === selectedSeason);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 border-b pb-7">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <IconBallFootball className="size-5" />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Bombers FC
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Leaderboard</h1>
            </div>
          </div>
          {selectedSeasonRecord?.status === "closed" && (
            <Button asChild className="hidden sm:inline-flex">
              <Link href={`/wrapped/${selectedSeasonRecord.slug}`}>
                <IconSparkles className="mr-2 size-4" />
                Season Wrapped
              </Link>
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Three for a win, two for a draw, one for showing up. Form runs oldest to newest.
            </p>
          </div>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Choose leaderboard" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.slug}>
                  {season.name} · {season.status}
                </SelectItem>
              ))}
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {selectedSeasonRecord?.status === "closed" && (
        <Button asChild className="mb-5 w-full sm:hidden">
          <Link href={`/wrapped/${selectedSeasonRecord.slug}`}>
            <IconSparkles className="mr-2 size-4" />
            Open {selectedSeasonRecord.name} Wrapped
          </Link>
        </Button>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card shadow-[0_18px_60px_-40px_rgba(61,37,16,0.5)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[74px]">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-center">Played</TableHead>
              <TableHead className="text-center">Points</TableHead>
              <TableHead className="hidden text-center md:table-cell">PPM</TableHead>
              <TableHead className="hidden text-center lg:table-cell">Last played</TableHead>
              <TableHead className="text-center">Win rate</TableHead>
              <TableHead className="hidden text-center sm:table-cell">W / D / L</TableHead>
              <TableHead className="hidden text-center xl:table-cell">Form</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-14 text-center text-muted-foreground">
                  Loading the table…
                </TableCell>
              </TableRow>
            ) : leaderboard.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-14 text-center text-muted-foreground">
                  No completed matches in this season yet.
                </TableCell>
              </TableRow>
            ) : (
              leaderboard.map((entry) => (
                <TableRow key={entry.playerId} className={entry.rank <= 3 ? "bg-primary/[0.035]" : ""}>
                  <TableCell>
                    <RankBadge rank={entry.rank} />
                  </TableCell>
                  <TableCell>
                    <div className="font-bold">{entry.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground sm:hidden">
                      {entry.wins}W · {entry.draws}D · {entry.losses}L
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{entry.matchesPlayed}</TableCell>
                  <TableCell className="text-center text-base font-black">{entry.points}</TableCell>
                  <TableCell className="hidden text-center md:table-cell">
                    {entry.avgPointsPerMatch.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden text-center lg:table-cell">
                    {formatDate(entry.lastPlayedDate)}
                  </TableCell>
                  <TableCell className="text-center font-bold">{entry.winRate}%</TableCell>
                  <TableCell className="hidden text-center sm:table-cell">
                    <span className="text-emerald-700">{entry.wins}</span>
                    {" / "}
                    <span className="text-muted-foreground">{entry.draws}</span>
                    {" / "}
                    <span className="text-red-700">{entry.losses}</span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex justify-center gap-1">
                      {entry.form.length === 0
                        ? "—"
                        : entry.form.map((result, index) => (
                            <FormBadge key={`${entry.playerId}-${index}`} result={result} />
                          ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <footer className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>{leaderboard.length} players ranked</span>
        {selectedSeasonRecord?.status === "closed" && (
          <Link
            href={`/wrapped/${selectedSeasonRecord.slug}`}
            className="flex items-center gap-1 font-semibold text-foreground hover:text-primary"
          >
            Relive the season <IconArrowUpRight className="size-3" />
          </Link>
        )}
      </footer>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const className =
    rank === 1
      ? "bg-amber-400 text-amber-950"
      : rank === 2
        ? "bg-stone-300 text-stone-900"
        : rank === 3
          ? "bg-amber-800 text-white"
          : "";
  return <Badge className={className}>{rank <= 3 ? ["1st", "2nd", "3rd"][rank - 1] : rank}</Badge>;
}

function FormBadge({ result }: { result: FormResult }) {
  const className =
    result === "W"
      ? "bg-emerald-600"
      : result === "D"
        ? "bg-stone-400"
        : "bg-red-600";
  return (
    <span className={`grid size-6 place-items-center rounded text-[10px] font-bold text-white ${className}`}>
      {result}
    </span>
  );
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
