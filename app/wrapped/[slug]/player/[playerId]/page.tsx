import { notFound } from "next/navigation";
import { PlayerStory } from "@/components/wrapped/player-story";
import { getRoundup } from "@/lib/queries";

type Props = { params: Promise<{ slug: string; playerId: string }> };

export default async function PlayerWrappedPage({ params }: Props) {
  const { slug, playerId } = await params;
  const roundup = await getRoundup(slug);
  if (!roundup) notFound();
  const player = roundup.players.find((item) => item.playerId === Number(playerId));
  if (!player) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PlayerStory roundup={roundup} player={player} />
    </div>
  );
}
