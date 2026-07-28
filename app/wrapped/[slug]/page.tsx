import { notFound } from "next/navigation";
import { ClubStory } from "@/components/wrapped/club-story";
import { getRoundup } from "@/lib/queries";

type Props = { params: Promise<{ slug: string }> };

export default async function WrappedPage({ params }: Props) {
  const { slug } = await params;
  const roundup = await getRoundup(slug);
  if (!roundup) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <ClubStory roundup={roundup} />
    </div>
  );
}
