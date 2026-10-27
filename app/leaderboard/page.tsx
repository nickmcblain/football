"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import type { FormResult, LeaderboardEntry, Season, UpcomingFixture } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [fixture, setFixture] = useState<UpcomingFixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [player, setPlayer] = useState<LeaderboardEntry | null>(null);

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
    async function loadFixture() {
      try {
        const response = await fetch("/api/public/upcoming");
        if (!response.ok) throw new Error("Failed to fetch the upcoming game");
        setFixture(await response.json());
      } catch {
        setFixture(null);
      }
    }
    loadFixture();
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
    <div className="mx-auto max-w-md pt-6">
      <h1 className="mb-5 flex justify-center">
        <Image
          src="/logo.png"
          alt="Bombers FC"
          width={232}
          height={288}
          priority
          className="h-24 w-auto"
        />
      </h1>
      <button
        type="button"
        onClick={() => fixture && setTeamsOpen(true)}
        disabled={!fixture}
        className="mx-4 block w-[calc(100%-2rem)] rounded-xl bg-white px-4 py-5 text-center shadow-[0_12px_40px_-24px_rgba(15,23,42,0.45)] disabled:cursor-default"
      >
        {fixture ? (
          <>
            <div className="text-base font-semibold">{fixture.seasonName}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {formatKickoff(fixture.date, fixture.time)}
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <SideMark label="Light" tone="light" />
              <div>
                {fixture.winner === "Not Played" || fixture.scoreA === null || fixture.scoreB === null ? (
                  <div className="text-3xl font-semibold tracking-tight">VS</div>
                ) : (
                  <div className="text-3xl font-semibold tracking-[0.14em]">
                    {padScore(fixture.scoreA)} - {padScore(fixture.scoreB)}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  {fixture.teamA.length || fixture.teamB.length
                    ? `${fixture.teamA.length} : ${fixture.teamB.length}`
                    : "Teams not picked"}
                </div>
              </div>
              <SideMark label="Dark" tone="dark" />
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              {[fixture.location, fixture.pitch].filter(Boolean).join(" · ") || "Tap for teams"}
            </div>
          </>
        ) : (
          <>
            <div className="text-base font-semibold">No upcoming game</div>
            <div className="mt-1 text-sm text-muted-foreground">
              The next fixture will show here once it is scheduled.
            </div>
          </>
        )}
      </button>

      <div className="mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {seasons.map((season) => (
          <SeasonPill
            key={season.id}
            active={selectedSeason === season.slug}
            onClick={() => setSelectedSeason(season.slug)}
          >
            {season.name}
          </SeasonPill>
        ))}
        <SeasonPill active={selectedSeason === "all-time"} onClick={() => setSelectedSeason("all-time")}>
          All time
        </SeasonPill>
      </div>

      <div className="mx-4 mt-4 overflow-hidden rounded-xl bg-white">
        <div className={`grid ${TABLE_COLUMNS} items-center px-3 py-3 text-xs text-muted-foreground`}>
          <span className="sr-only">Position</span>
          <span>Player</span>
          <span className="text-center">P</span>
          <span className="text-center">W</span>
          <span className="text-right">Win%</span>
          <span className="text-right">Pts</span>
        </div>
        {loading ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">Loading the table…</div>
        ) : leaderboard.length === 0 ? (
          <div className="px-3 py-10 text-center text-sm text-muted-foreground">
            No completed matches in this season yet.
          </div>
        ) : (
          leaderboard.map((entry, index) => (
            <button
              key={entry.playerId}
              type="button"
              onClick={() => setPlayer(entry)}
              className={`grid w-full ${TABLE_COLUMNS} items-center px-3 py-3 text-left ${rowBackground(entry.rank, index)}`}
            >
              <span className="text-sm text-muted-foreground">{entry.rank}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium ${initialBackground(entry.rank)}`}>
                  {entry.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-sm font-medium">{entry.name}</span>
              </span>
              <span className="text-center text-sm">{entry.matchesPlayed}</span>
              <span className="text-center text-sm">{entry.wins}</span>
              <span className="text-right text-sm">{entry.winRate}%</span>
              <span className="text-right text-sm font-semibold">{entry.points}</span>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between px-5 pb-2 text-xs text-muted-foreground">
        <span>{leaderboard.length} players</span>
        {selectedSeasonRecord?.status === "closed" && (
          <Link href={`/wrapped/${selectedSeasonRecord.slug}`} className="font-medium text-foreground">
            Season wrapped
          </Link>
        )}
      </div>

      <Dialog open={teamsOpen} onOpenChange={setTeamsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {fixture ? formatKickoff(fixture.date, fixture.time) : "Teams"}
            </DialogTitle>
          </DialogHeader>
          {fixture && fixture.teamA.length + fixture.teamB.length === 0 ? (
            <p className="text-muted-foreground">Teams have not been picked yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Lineup title="Light" players={fixture?.teamA ?? []} />
              <Lineup title="Dark" players={fixture?.teamB ?? []} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={player !== null} onOpenChange={(open) => !open && setPlayer(null)}>
        <DialogContent>
          {player && (
            <>
              <DialogHeader>
                <DialogTitle>{player.name}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                {ordinal(player.rank)} · {player.winRate}% win rate
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Points" value={String(player.points)} />
                <Stat label="Played" value={String(player.matchesPlayed)} />
                <Stat label="Per game" value={player.avgPointsPerMatch.toFixed(1)} />
                <Stat label="Wins" value={String(player.wins)} />
                <Stat label="Draws" value={String(player.draws)} />
                <Stat label="Losses" value={String(player.losses)} />
              </div>
              <div>
                <div className="mb-2 text-xs text-muted-foreground">Form, oldest to newest</div>
                <div className="flex gap-1.5">
                  {player.form.length === 0
                    ? <span className="text-sm text-muted-foreground">No games yet</span>
                    : player.form.map((result, index) => (
                        <FormMark key={`${player.playerId}-${index}`} result={result} />
                      ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Last played {formatDate(player.lastPlayedDate)}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeasonPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 shrink-0 rounded-lg px-4 text-sm ${
        active ? "bg-neutral-900 text-white" : "bg-white text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SideMark({ label, tone }: { label: string; tone: "light" | "dark" }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`grid size-14 place-items-center rounded-full text-sm font-semibold ${
          tone === "light" ? "border border-black/10 bg-white" : "bg-neutral-900 text-white"
        }`}
      >
        {label.slice(0, 1)}
      </span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function Lineup({
  title,
  players,
}: {
  title: string;
  players: UpcomingFixture["teamA"];
}) {
  const order = { Attack: 0, Midfield: 1, Defense: 2 };
  const sorted = [...players].sort(
    (a, b) => order[a.position] - order[b.position] || a.name.localeCompare(b.name),
  );
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nobody yet</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((person) => (
            <li key={person.id}>
              <div className="text-sm">{person.name}</div>
              <div className="text-xs text-muted-foreground">{person.position}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-3">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FormMark({ result }: { result: FormResult }) {
  const className =
    result === "W" ? "bg-neutral-900 text-white" : result === "D" ? "bg-neutral-200 text-neutral-700" : "bg-red-100 text-red-700";
  return (
    <span className={`grid size-8 place-items-center rounded-full text-xs font-semibold ${className}`}>
      {result}
    </span>
  );
}

function padScore(score: number) {
  return String(score).padStart(2, "0");
}

function formatKickoff(date: string, time: string) {
  const parsed = new Date(`${date}T${time.length === 5 ? time : "00:00"}`);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;
  return parsed.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const TABLE_COLUMNS = "grid-cols-[2rem_minmax(0,1fr)_1.5rem_1.5rem_2.75rem_2.25rem]";

function rowBackground(rank: number, index: number) {
  if (rank === 1) return "bg-[#f6edd4]";
  if (rank === 2) return "bg-[#e7ebf0]";
  if (rank === 3) return "bg-[#f4e4d4]";
  return index % 2 === 1 ? "bg-neutral-50" : "bg-white";
}

function initialBackground(rank: number) {
  if (rank === 1) return "bg-[#efe0b0]";
  if (rank === 2) return "bg-[#d5dbe3]";
  if (rank === 3) return "bg-[#e8d0b8]";
  return "bg-neutral-100";
}

function ordinal(rank: number) {
  const suffix = rank % 10 === 1 && rank % 100 !== 11
    ? "st"
    : rank % 10 === 2 && rank % 100 !== 12
      ? "nd"
      : rank % 10 === 3 && rank % 100 !== 13
        ? "rd"
        : "th";
  return `${rank}${suffix}`;
}
