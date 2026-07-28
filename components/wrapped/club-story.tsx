"use client";

import Link from "next/link";
import {
  IconArrowUpRight,
  IconBolt,
  IconFriends,
  IconMedal,
  IconShirt,
  IconUsers,
} from "@tabler/icons-react";
import type { DuoStats, PlayerAward, SeasonRoundup } from "@/lib/types";
import { StoryCarousel, type StorySlide } from "./story-carousel";

export function ClubStory({ roundup }: { roundup: SeasonRoundup }) {
  const slides: StorySlide[] = [
    {
      key: "cover",
      eyebrow: "The final whistle",
      className: "bg-[#f2b632] text-[#1c160d]",
      content: (
        <div className="max-w-xl">
          <p className="mb-3 text-2xl font-bold">Bombers FC presents</p>
          <h1 className="text-[clamp(4rem,18vw,9rem)] font-black leading-[0.78] tracking-[-0.08em]">
            {roundup.season.name}
          </h1>
          <p className="mt-7 text-3xl font-black uppercase tracking-tight">Season Wrapped</p>
          <p className="mt-3 max-w-md text-sm font-semibold opacity-70">
            Every appearance. Every partnership. Every point earned under the lights.
          </p>
        </div>
      ),
    },
    {
      key: "season",
      eyebrow: "A season in numbers",
      className: "bg-[#21543d] text-[#f9f0d0]",
      content: (
        <div>
          <BigNumber value={roundup.totals.matchesPlayed} label="matches played" />
          <div className="mt-10 grid grid-cols-2 gap-4">
            <MiniMetric value={roundup.totals.uniquePlayers} label="players involved" />
            <MiniMetric value={roundup.totals.totalAppearances} label="total appearances" />
          </div>
        </div>
      ),
    },
    {
      key: "champions",
      eyebrow: "Top of the table",
      className: "bg-[#8f291f] text-[#fff2d2]",
      content: (
        <div>
          <IconMedal className="mb-6 size-12 text-amber-300" stroke={1.5} />
          <h2 className="text-5xl font-black leading-none tracking-[-0.055em] sm:text-7xl">
            {names(roundup.champions)}
          </h2>
          <p className="mt-5 text-lg font-bold opacity-70">
            {roundup.champions[0]?.value ?? 0} points. Season champion
            {roundup.champions.length === 1 ? "" : "s"}.
          </p>
          <div className="mt-10 space-y-2 border-t border-current/20 pt-6">
            {roundup.podium.map((player) => (
              <div key={player.playerId} className="flex items-center justify-between text-sm font-bold">
                <span>
                  #{player.rank} {player.name}
                </span>
                <span>{player.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "appearances",
      eyebrow: "Always on the team sheet",
      className: "bg-[#e9e1c6] text-[#1d3b2d]",
      content: (
        <div>
          <IconBolt className="mb-8 size-14 fill-current" stroke={1.5} />
          <h2 className="text-5xl font-black leading-[0.92] tracking-[-0.055em] sm:text-7xl">
            {names(roundup.mostAppearances)}
          </h2>
          <p className="mt-6 text-2xl font-black">
            {roundup.mostAppearances[0]?.value ?? 0} appearances
          </p>
          <p className="mt-3 max-w-sm font-semibold opacity-65">
            Rain, late kick-offs, last-minute venue changes—still there.
          </p>
        </div>
      ),
    },
    {
      key: "colours",
      eyebrow: "Light vs Dark",
      className: "bg-[#23211d] text-[#fff3cc]",
      content: (
        <div>
          <IconShirt className="mb-7 size-12 text-amber-300" stroke={1.5} />
          <h2 className="mb-8 text-5xl font-black leading-none tracking-[-0.06em]">
            Which shirt ruled?
          </h2>
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/20">
            <ColourMetric
              className="bg-[#f4edd9] text-[#1b1916]"
              value={roundup.teamSplit.lightWinPercentage}
              label="Light"
              count={roundup.teamSplit.lightWins}
            />
            <ColourMetric
              className="bg-[#0d0d0c] text-white"
              value={roundup.teamSplit.darkWinPercentage}
              label="Dark"
              count={roundup.teamSplit.darkWins}
            />
            <ColourMetric
              className="bg-[#f2b632] text-[#1b1916]"
              value={roundup.teamSplit.drawPercentage}
              label="Draw"
              count={roundup.teamSplit.draws}
            />
          </div>
        </div>
      ),
    },
    {
      key: "rates",
      eyebrow: "The highs and lows",
      className: "bg-[#2d3e78] text-[#f8e9bd]",
      content: (
        <div className="space-y-9">
          <AwardBlock
            kicker="Best win rate"
            awards={roundup.bestWinRate}
            empty="No eligible player"
          />
          <div className="h-px bg-current/20" />
          <AwardBlock
            kicker="Toughest campaign"
            awards={roundup.worstWinRate}
            empty="No eligible player"
          />
          <p className="text-xs font-semibold opacity-55">Minimum three appearances.</p>
        </div>
      ),
    },
    {
      key: "duos",
      eyebrow: "Better together",
      className: "bg-[#d95b29] text-[#fff1cf]",
      content: (
        <div>
          <IconFriends className="mb-8 size-14" stroke={1.5} />
          <DuoBlock title="Dream team" duos={roundup.bestDuos} />
          <div className="my-8 h-px bg-current/20" />
          <DuoBlock title="Character building" duos={roundup.worstDuos} />
          <p className="mt-6 text-xs font-semibold opacity-55">
            Same team at least three times.
          </p>
        </div>
      ),
    },
    {
      key: "players",
      eyebrow: "Now make it personal",
      className: "bg-[#f0c84a] text-[#1d261e]",
      content: (
        <div>
          <IconUsers className="mb-5 size-11" stroke={1.8} />
          <h2 className="text-4xl font-black leading-none tracking-[-0.05em] sm:text-6xl">
            Find your season
          </h2>
          <p className="mt-4 max-w-md text-sm font-semibold opacity-70">
            Your rank, record, shirt split, and the teammates who changed everything.
          </p>
          <div className="mt-8 max-h-[42vh] space-y-2 overflow-y-auto pr-2">
            {roundup.players.map((player) => (
              <Link
                key={player.playerId}
                href={`/wrapped/${roundup.season.slug}/player/${player.playerId}`}
                className="flex items-center justify-between rounded-xl border-2 border-current/15 bg-white/35 px-4 py-3 font-black transition hover:-translate-y-0.5 hover:bg-white/60 motion-reduce:transform-none"
              >
                <span>{player.name}</span>
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider">
                  #{player.leaderboardRank}
                  <IconArrowUpRight className="size-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <StoryCarousel slides={slides} seasonName={roundup.season.name} backHref="/leaderboard" />
  );
}

function names(awards: PlayerAward[]) {
  return awards.length > 0 ? awards.map((award) => award.name).join(" & ") : "No result";
}

function BigNumber({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-[clamp(7rem,30vw,13rem)] font-black leading-[0.72] tracking-[-0.09em]">
        {value}
      </div>
      <div className="mt-6 text-xl font-black uppercase tracking-tight">{label}</div>
    </div>
  );
}

function MiniMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-t-2 border-current pt-4">
      <div className="text-4xl font-black">{value}</div>
      <div className="mt-2 text-xs font-bold uppercase tracking-wider opacity-65">{label}</div>
    </div>
  );
}

function ColourMetric({
  className,
  value,
  label,
  count,
}: {
  className: string;
  value: number;
  label: string;
  count: number;
}) {
  return (
    <div className={`px-2 py-7 text-center ${className}`}>
      <div className="text-3xl font-black sm:text-5xl">{value}%</div>
      <div className="mt-2 text-xs font-black uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-[10px] opacity-60">{count} wins</div>
    </div>
  );
}

function AwardBlock({
  kicker,
  awards,
  empty,
}: {
  kicker: string;
  awards: PlayerAward[];
  empty: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{kicker}</p>
      <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.045em] sm:text-6xl">
        {awards.length ? names(awards) : empty}
      </h2>
      {awards[0] && <p className="mt-3 text-xl font-black">{awards[0].value}% win rate</p>}
    </div>
  );
}

function DuoBlock({ title, duos }: { title: string; duos: DuoStats[] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{title}</p>
      {duos.length ? (
        <>
          <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl">
            {duos.map((duo) => duo.names.join(" + ")).join(" / ")}
          </h2>
          <p className="mt-3 text-lg font-black">
            {duos[0].winRate}% across {duos[0].matchesPlayed} matches
          </p>
        </>
      ) : (
        <h2 className="mt-3 text-3xl font-black">Not enough shared games</h2>
      )}
    </div>
  );
}
