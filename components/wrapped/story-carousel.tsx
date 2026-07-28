"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconArrowRight,
  IconChevronLeft,
  IconShare3,
  IconTrophy,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface StorySlide {
  key: string;
  eyebrow: string;
  className: string;
  content: React.ReactNode;
}

export function StoryCarousel({
  slides,
  seasonName,
  backHref,
}: {
  slides: StorySlide[];
  seasonName: string;
  backHref: string;
}) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef<number | null>(null);

  const goTo = useCallback(function goTo(next: number) {
    setCurrent(Math.max(0, Math.min(slides.length - 1, next)));
  }, [slides.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === " ") goTo(current + 1);
      if (event.key === "ArrowLeft") goTo(current - 1);
      if (event.key === "Home") goTo(0);
      if (event.key === "End") goTo(slides.length - 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, slides.length, goTo]);

  async function share() {
    const data = {
      title: `Bombers FC ${seasonName} Wrapped`,
      text: `See the Bombers FC ${seasonName} season story`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        toast.success("Share link copied");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this story");
    }
  }

  const slide = slides[current];

  return (
    <main
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden rounded-[28px] bg-[#19150f] text-white shadow-2xl sm:min-h-[760px]"
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
        if (Math.abs(distance) > 50) goTo(current + (distance < 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 p-4">
        {slides.map((item, index) => (
          <button
            key={item.key}
            type="button"
            aria-label={`Go to story ${index + 1}`}
            onClick={() => goTo(index)}
            className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <span
              className={cn(
                "block h-full rounded-full bg-white transition-[width] duration-300 motion-reduce:transition-none",
                index < current ? "w-full" : index === current ? "w-full" : "w-0",
              )}
            />
          </button>
        ))}
      </div>

      <div className="absolute inset-x-0 top-9 z-20 flex items-center justify-between px-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="rounded-full text-white hover:bg-white/15 hover:text-white"
        >
          <Link href={backHref} aria-label="Back">
            <IconChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em]">
          <IconTrophy className="size-4 text-amber-300" />
          Bombers FC
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={share}
          className="rounded-full text-white hover:bg-white/15 hover:text-white"
          aria-label="Share story"
        >
          <IconShare3 className="size-5" />
        </Button>
      </div>

      <section
        key={slide.key}
        aria-live="polite"
        className={cn(
          "wrapped-slide relative flex min-h-[calc(100vh-4rem)] flex-col justify-between overflow-hidden px-6 pb-24 pt-28 sm:min-h-[760px] sm:px-12 sm:pb-28 sm:pt-32",
          slide.className,
        )}
      >
        <div className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full border-[42px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-80 rotate-12 border-[38px] border-white/10" />
        <div className="relative z-10">
          <p className="mb-5 text-xs font-black uppercase tracking-[0.28em] text-current/70">
            {slide.eyebrow}
          </p>
          {slide.content}
        </div>
        <p className="relative z-10 text-xs font-bold uppercase tracking-[0.24em] text-current/60">
          {seasonName} · {current + 1}/{slides.length}
        </p>
      </section>

      <div className="absolute inset-x-0 bottom-5 z-20 flex items-center justify-between px-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="rounded-full bg-black/20 text-white backdrop-blur hover:bg-black/35 hover:text-white disabled:opacity-20"
          aria-label="Previous story"
        >
          <IconArrowLeft className="size-5" />
        </Button>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          Tap, swipe, or use arrows
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo(current + 1)}
          disabled={current === slides.length - 1}
          className="rounded-full bg-black/20 text-white backdrop-blur hover:bg-black/35 hover:text-white disabled:opacity-20"
          aria-label="Next story"
        >
          <IconArrowRight className="size-5" />
        </Button>
      </div>
    </main>
  );
}
