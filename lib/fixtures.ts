export function pickUpcomingMatch<T extends { date: string; time: string; winner: string }>(
  matches: readonly T[],
): T | null {
  const open = matches.filter((match) => match.winner === "Not Played");
  open.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return open[0] ?? null;
}
