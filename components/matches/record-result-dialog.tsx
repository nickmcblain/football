"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Match, Winner } from "@/lib/types";
import { winnerFromScores } from "@/lib/results";

type ResultDraft = {
  winner: Winner;
  scoreA: number | null;
  scoreB: number | null;
};

function stepScore(value: string, delta: number) {
  const current = value === "" ? 0 : Number(value);
  return String(Math.max(0, current + delta));
}

function ScoreField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-2 grid w-full grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0 text-lg"
          onClick={() => onChange(stepScore(value, -1))}
          aria-label={`Decrease ${label} score`}
        >
          −
        </Button>
        <Input
          inputMode="numeric"
          aria-label={`${label} score`}
          className="h-12 w-auto min-w-0 flex-1 text-center text-2xl"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        />
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0 text-lg"
          onClick={() => onChange(stepScore(value, 1))}
          aria-label={`Increase ${label} score`}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function RecordResultDialog({
  match,
  open,
  onOpenChange,
  onSave,
}: {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (matchId: number, result: ResultDraft) => Promise<void>;
}) {
  const [winner, setWinner] = useState<Winner>("Not Played");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!match || !open) return;
    setWinner(match.winner);
    setScoreA(match.scoreA === null ? "" : String(match.scoreA));
    setScoreB(match.scoreB === null ? "" : String(match.scoreB));
  }, [match, open]);

  function applyScore(nextA: string, nextB: string) {
    setScoreA(nextA);
    setScoreB(nextB);
    if (nextA !== "" && nextB !== "") {
      setWinner(winnerFromScores(Number(nextA), Number(nextB)));
    }
  }

  function chooseWinner(next: Winner) {
    const bothScores = scoreA !== "" && scoreB !== "";
    if (bothScores && winnerFromScores(Number(scoreA), Number(scoreB)) !== next) {
      setScoreA("");
      setScoreB("");
    }
    setWinner(next);
  }

  async function save(result: ResultDraft) {
    if (!match) return;
    setSaving(true);
    try {
      await onSave(match.id, result);
    } finally {
      setSaving(false);
    }
  }

  const choices: { winner: Exclude<Winner, "Not Played">; label: string; detail: string }[] = [
    { winner: "Team A", label: "Light", detail: "won" },
    { winner: "Draw", label: "Draw", detail: "level" },
    { winner: "Team B", label: "Dark", detail: "won" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record result</DialogTitle>
        </DialogHeader>
        {match && (
          <div className="min-w-0 space-y-5">
            <p className="text-sm text-muted-foreground">
              {match.date}
              {match.time ? ` · ${match.time}` : ""}
            </p>
            <div className="grid min-w-0 grid-cols-3 gap-2">
              {choices.map((choice) => (
                <Button
                  key={choice.winner}
                  type="button"
                  variant={winner === choice.winner ? "default" : "outline"}
                  className="h-16 min-w-0 shrink flex-col px-1"
                  onClick={() => chooseWinner(choice.winner)}
                >
                  <span className="text-sm">{choice.label}</span>
                  <span className="text-xs opacity-80">{choice.detail}</span>
                </Button>
              ))}
            </div>
            <div className="space-y-3">
              <ScoreField label="Light" value={scoreA} onChange={(value) => applyScore(value, scoreB)} />
              <ScoreField label="Dark" value={scoreB} onChange={(value) => applyScore(scoreA, value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              The score is Light then Dark. Leave both empty if you only know who won.
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            disabled={saving}
            onClick={() => save({ winner: "Not Played", scoreA: null, scoreB: null })}
          >
            Not played
          </Button>
          <Button
            type="button"
            className="h-12 w-full"
            disabled={saving || winner === "Not Played"}
            onClick={() =>
              save({
                winner,
                scoreA: scoreA === "" ? null : Number(scoreA),
                scoreB: scoreB === "" ? null : Number(scoreB),
              })
            }
          >
            Save result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
