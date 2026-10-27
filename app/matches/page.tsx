"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Season, Winner } from "@/lib/types";
import { formatResult } from "@/lib/results";

interface PublicPlayer {
  id: number;
  name: string;
}

interface PublicMatch {
  id: number;
  date: string;
  time: string;
  location: string;
  pitch: string;
  winner: Winner;
  scoreA: number | null;
  scoreB: number | null;
  teamA: PublicPlayer[];
  teamB: PublicPlayer[];
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<PublicMatch[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    async function loadSeasons() {
      try {
        const response = await fetch("/api/public/seasons");
        if (!response.ok) throw new Error("Failed to fetch seasons");
        const data: Season[] = await response.json();
        setSeasons(data);
        const preferred = data.find((season) => season.status === "active") ?? data[0];
        setSelectedSeasonId(preferred ? String(preferred.id) : "all");
      } catch {
        setSelectedSeasonId("all");
      }
    }
    loadSeasons();
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => setCanManage(response.ok))
      .catch(() => setCanManage(false));
  }, []);

  useEffect(() => {
    if (!selectedSeasonId) return;
    async function loadMatches() {
      setLoading(true);
      setFailed(false);
      try {
        const query = selectedSeasonId === "all" ? "" : `?seasonId=${selectedSeasonId}`;
        const response = await fetch(`/api/public/matches${query}`);
        if (!response.ok) throw new Error("Failed to fetch matches");
        setMatches(await response.json());
      } catch {
        setFailed(true);
        toast.error("Failed to load matches");
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, [selectedSeasonId]);

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
        {canManage ? (
          <Link href="/manage/matches" className="text-sm font-medium text-muted-foreground">
            Manage
          </Link>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {seasons.map((season) => (
          <SeasonPill
            key={season.id}
            active={selectedSeasonId === String(season.id)}
            onClick={() => setSelectedSeasonId(String(season.id))}
          >
            {season.name}
          </SeasonPill>
        ))}
        <SeasonPill active={selectedSeasonId === "all"} onClick={() => setSelectedSeasonId("all")}>
          All
        </SeasonPill>
      </div>

      {loading ? (
        <div className="rounded-xl bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
          Loading matches…
        </div>
      ) : failed ? (
        <div className="rounded-xl bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
          The fixtures could not be loaded.
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl bg-card px-4 py-10 text-center text-sm text-muted-foreground shadow-sm">
          No matches in this season yet.
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <article key={match.id} className="rounded-xl bg-card px-4 py-4 shadow-sm">
              <div className="text-sm font-medium">{formatKickoff(match.date, match.time)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {[match.location, match.pitch].filter(Boolean).join(" · ") || "Venue to be confirmed"}
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
                <Team title="Light" players={match.teamA} />
                <Score match={match} />
                <Team title="Dark" players={match.teamB} align="right" />
              </div>
            </article>
          ))}
        </div>
      )}
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

function Team({
  title,
  players,
  align = "left",
}: {
  title: string;
  players: PublicPlayer[];
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-sm font-medium">{title}</div>
      {players.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No one listed</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {players.map((player) => (
            <li key={player.id} className="text-sm">
              {player.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Score({ match }: { match: PublicMatch }) {
  const hasScore = match.scoreA !== null && match.scoreB !== null && match.winner !== "Not Played";
  return (
    <div className="pt-5 text-center">
      {hasScore ? (
        <>
          <div className="text-xl font-semibold tracking-wide">
            {match.scoreA}–{match.scoreB}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{formatResult({ ...match, scoreA: null, scoreB: null })}</div>
        </>
      ) : (
        <div className="text-sm font-medium text-muted-foreground">{formatResult(match)}</div>
      )}
    </div>
  );
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
