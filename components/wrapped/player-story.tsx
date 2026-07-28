"use client";

import { IconChartBar, IconFriends, IconMedal, IconShirt, IconTrophy } from "@tabler/icons-react";
import type { DuoStats, FormResult, PersonalRoundup, SeasonRoundup, TeamRecord } from "@/lib/types";
import { StoryCarousel, type StorySlide } from "./story-carousel";

export function PlayerStory({
  roundup,
  player,
}: {
  roundup: SeasonRoundup;
  player: PersonalRoundup;
}) {
  const slides: StorySlide[] = [
    {
      key: "cover",
      eyebrow: `${roundup.season.name} player story`,
      className: "bg-[#f2b632] text-[#1d190f]",
      content: (
        <div>
          <p className="mb-4 text-xl font-bold">This season belonged to</p>
          <h1 className="max-w-3xl text-[clamp(4rem,17vw,8rem)] font-black leading-[0.82] tracking-[-0.075em]">
            {player.name}
          </h1>
          <p className="mt-7 text-sm font-black uppercase tracking-[0.2em]">
            Rank #{player.leaderboardRank} · {player.points} points
          </p>
        </div>
      ),
    },
    {
      key: "appearances",
      eyebrow: "On the team sheet",
      className: "bg-[#1f543d] text-[#fff1c7]",
      content: (
        <div>
          <div className="text-[clamp(8rem,34vw,14rem)] font-black leading-[0.7] tracking-[-0.1em]">
            {player.appearances}
          </div>
          <h2 className="mt-8 text-4xl font-black leading-none tracking-[-0.05em]">
            appearances
          </h2>
          <p className="mt-4 text-xl font-bold opacity-65">
            #{player.attendanceRank} for attendance this season.
          </p>
        </div>
      ),
    },
    {
      key: "points",
      eyebrow: "The table never lies",
      className: "bg-[#8f291f] text-[#fff2d2]",
      content: (
        <div>
          <IconMedal className="mb-7 size-14 text-amber-300" stroke={1.5} />
          <div className="text-8xl font-black leading-none tracking-[-0.08em]">{player.points}</div>
          <h2 className="mt-2 text-3xl font-black">points earned</h2>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <Metric value={`#${player.leaderboardRank}`} label="final rank" />
            <Metric value={player.avgPointsPerMatch.toFixed(1)} label="points per match" />
          </div>
        </div>
      ),
    },
    {
      key: "record",
      eyebrow: "The record",
      className: "bg-[#2d3e78] text-[#faeec8]",
      content: (
        <div>
          <IconChartBar className="mb-8 size-13" stroke={1.6} />
          <div className="grid grid-cols-3 gap-3">
            <Record value={player.wins} label="Wins" />
            <Record value={player.draws} label="Draws" />
            <Record value={player.losses} label="Losses" />
          </div>
          <div className="mt-10 text-7xl font-black tracking-[-0.075em]">{player.winRate}%</div>
          <p className="mt-2 text-xl font-black">win rate</p>
          <div className="mt-8 flex gap-2">
            {player.form.map((result, index) => (
              <FormResultBadge key={index} result={result} />
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "shirts",
      eyebrow: "Choose your colours",
      className: "bg-[#25231e] text-[#fff2c9]",
      content: (
        <div>
          <IconShirt className="mb-7 size-13 text-amber-300" stroke={1.5} />
          <h2 className="mb-8 text-5xl font-black leading-none tracking-[-0.06em]">
            Two shirts. Two stories.
          </h2>
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/20">
            <ShirtRecord name="Light" record={player.light} className="bg-[#f4edd9] text-[#171613]" />
            <ShirtRecord name="Dark" record={player.dark} className="bg-[#0c0c0b] text-white" />
          </div>
        </div>
      ),
    },
    {
      key: "partners",
      eyebrow: "Your partnerships",
      className: "bg-[#d95b29] text-[#fff2d2]",
      content: (
        <div>
          <IconFriends className="mb-7 size-13" stroke={1.5} />
          <Partner title="Best together" duos={player.bestPartners} playerId={player.playerId} />
          <div className="my-8 h-px bg-current/25" />
          <Partner title="A work in progress" duos={player.worstPartners} playerId={player.playerId} />
          <p className="mt-6 text-xs font-semibold opacity-55">
            Partnerships require three matches together.
          </p>
        </div>
      ),
    },
    {
      key: "summary",
      eyebrow: "Your season, signed off",
      className: "bg-[#efe3bf] text-[#203b2d]",
      content: (
        <div>
          <IconTrophy className="mb-7 size-13 text-[#b33c28]" stroke={1.5} />
          <h2 className="text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl">
            {player.name}
          </h2>
          <p className="mt-4 text-xl font-black">{roundup.season.name} Wrapped</p>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y-2 border-current py-8">
            <Metric value={`#${player.leaderboardRank}`} label="rank" />
            <Metric value={player.points} label="points" />
            <Metric value={player.appearances} label="appearances" />
            <Metric value={`${player.winRate}%`} label="win rate" />
          </div>
          <p className="mt-7 text-sm font-bold opacity-65">
            Use the share button above to send your season to the group.
          </p>
        </div>
      ),
    },
  ];

  return (
    <StoryCarousel
      slides={slides}
      seasonName={roundup.season.name}
      backHref={`/wrapped/${roundup.season.slug}`}
    />
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="border-t-2 border-current pt-3">
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>
    </div>
  );
}

function Record({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-current/20 bg-white/10 p-4 text-center">
      <div className="text-5xl font-black">{value}</div>
      <div className="mt-2 text-xs font-black uppercase tracking-wider opacity-60">{label}</div>
    </div>
  );
}

function FormResultBadge({ result }: { result: FormResult }) {
  const className =
    result === "W" ? "bg-emerald-500" : result === "D" ? "bg-stone-400" : "bg-red-500";
  return (
    <span className={`grid size-11 place-items-center rounded-full text-sm font-black text-white ${className}`}>
      {result}
    </span>
  );
}

function ShirtRecord({
  name,
  record,
  className,
}: {
  name: string;
  record: TeamRecord;
  className: string;
}) {
  return (
    <div className={`p-5 ${className}`}>
      <div className="text-xs font-black uppercase tracking-[0.2em] opacity-55">{name}</div>
      <div className="mt-4 text-5xl font-black tracking-[-0.06em]">{record.winRate}%</div>
      <div className="mt-1 text-xs font-bold">win rate</div>
      <div className="mt-5 text-xs font-bold opacity-60">
        {record.wins}W · {record.draws}D · {record.losses}L
      </div>
    </div>
  );
}

function Partner({
  title,
  duos,
  playerId,
}: {
  title: string;
  duos: DuoStats[];
  playerId: number;
}) {
  const partnerNames = duos.map((duo) =>
    duo.playerIds[0] === playerId ? duo.names[1] : duo.names[0],
  );
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">{title}</p>
      <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.045em] sm:text-6xl">
        {partnerNames.length ? partnerNames.join(" & ") : "Not enough games"}
      </h2>
      {duos[0] && (
        <p className="mt-3 text-lg font-black">
          {duos[0].winRate}% across {duos[0].matchesPlayed} matches
        </p>
      )}
    </div>
  );
}
