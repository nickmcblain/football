"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconCalendarPlus,
  IconExternalLink,
  IconLock,
  IconPencil,
  IconTrophy,
} from "@tabler/icons-react";
import { toast } from "sonner";
import type { Season } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const emptyForm = { name: "", startDate: "", endDate: "" };

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closingSeason, setClosingSeason] = useState<Season | null>(null);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function fetchSeasons() {
    try {
      const response = await fetch("/api/seasons");
      if (!response.ok) throw new Error("Failed to fetch seasons");
      setSeasons(await response.json());
    } catch {
      toast.error("Failed to load seasons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSeasons();
  }, []);

  function openCreate() {
    setEditingSeason(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(season: Season) {
    setEditingSeason(season);
    setForm({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
    });
    setDialogOpen(true);
  }

  async function saveSeason(event: React.FormEvent) {
    event.preventDefault();
    const url = editingSeason ? `/api/seasons/${editingSeason.id}` : "/api/seasons";
    const response = await fetch(url, {
      method: editingSeason ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Failed to save season");
      return;
    }
    toast.success(editingSeason ? "Season updated" : "Season created");
    setDialogOpen(false);
    fetchSeasons();
  }

  async function closeSelectedSeason() {
    if (!closingSeason) return;
    const response = await fetch(`/api/seasons/${closingSeason.id}/close`, {
      method: "POST",
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Failed to close season");
      return;
    }
    toast.success(`${closingSeason.name} closed and Wrapped published`);
    setClosingSeason(null);
    fetchSeasons();
  }

  const activeSeason = seasons.find((season) => season.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seasons</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            One active season at a time. Close it when the results are in.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate} disabled={Boolean(activeSeason)}>
          <IconCalendarPlus className="mr-2 size-4" />
          New season
        </Button>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-card p-10 text-center text-muted-foreground shadow-sm">Loading…</div>
      ) : seasons.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent>
            <IconTrophy className="mx-auto mb-4 size-10 text-primary" />
            <h2 className="text-lg font-bold">Create the first season</h2>
            <p className="mt-2 text-muted-foreground">
              Matches can be created as soon as a season is active.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {seasons.map((season) => {
            const unfinished = season.matchCount - season.completedMatchCount;
            return (
              <Card
                key={season.id}
                className={season.status === "active" ? "ring-2 ring-primary" : ""}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-black">
                    {season.name}
                    <Badge variant={season.status === "active" ? "default" : "secondary"}>
                      {season.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {new Date(`${season.startDate}T12:00:00`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" — "}
                    {new Date(`${season.endDate}T12:00:00`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </CardDescription>
                  <CardAction>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(season)}>
                      <IconPencil className="size-4" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="Fixtures" value={season.matchCount} />
                    <Stat label="Played" value={season.completedMatchCount} />
                    <Stat label="Pending" value={unfinished} />
                  </div>

                  {season.status === "active" ? (
                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground">
                        {unfinished > 0
                          ? `${unfinished} result${unfinished === 1 ? "" : "s"} still to resolve`
                          : "Ready to close and publish"}
                      </p>
                      <Button
                        className="w-full sm:w-auto"
                        variant="outline"
                        onClick={() => setClosingSeason(season)}
                        disabled={unfinished > 0}
                      >
                        <IconLock className="mr-2 size-4" />
                        Close season
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground">
                        Published{" "}
                        {season.closedAt
                          ? new Date(season.closedAt).toLocaleDateString("en-GB")
                          : ""}
                      </p>
                      <Button className="w-full sm:w-auto" variant="outline" asChild>
                        <Link href={`/wrapped/${season.slug}`} target="_blank">
                          View Wrapped
                          <IconExternalLink className="ml-2 size-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeason ? "Edit season" : "Create season"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveSeason} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="season-name">Season name</Label>
              <Input
                id="season-name"
                placeholder="2026/27"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="season-start">Starts</Label>
                <Input
                  id="season-start"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="season-end">Ends</Label>
                <Input
                  id="season-end"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingSeason ? "Save changes" : "Create season"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(closingSeason)} onOpenChange={() => setClosingSeason(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close {closingSeason?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This publishes the club and player Wrapped stories. Existing results can still be
              corrected later, and the story will update automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={closeSelectedSeason}>Close and publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
