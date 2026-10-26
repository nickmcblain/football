"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconArrowsShuffle2,
  IconScale,
  IconTrophy,
  IconEye,
} from "@tabler/icons-react";
import { Match, Player, Season, Winner } from "@/lib/types";
import { formatResult, normalizeResult } from "@/lib/results";
import { RecordResultDialog } from "@/components/matches/record-result-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { IconX } from "@tabler/icons-react";

type BalanceSummary = {
  teamAWinRate: number;
  teamBWinRate: number;
  players: { id: number; winRate: number; matchesPlayed: number }[];
};

function formatWinRate(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}
const formatGBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
}).format;

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [deletingMatch, setDeletingMatch] = useState<Match | null>(null);
  const [teamsMatch, setTeamsMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    price: "",
    location: "",
    pitch: "",
  });
  const [viewTeamsDialogOpen, setViewTeamsDialogOpen] = useState(false);
  const [viewTeamsMatch, setViewTeamsMatch] = useState<Match | null>(null);
  const [teamA, setTeamA] = useState<number[]>([]);
  const [teamB, setTeamB] = useState<number[]>([]);
  const [attendees, setAttendees] = useState<number[]>([]);
  const [teamAInput, setTeamAInput] = useState("");
  const [teamBInput, setTeamBInput] = useState("");
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const teamsDialogContentRef = useRef<HTMLDivElement>(null);

  const fetchMatches = useCallback(async function fetchMatches() {
    try {
      const query = selectedSeasonId ? `?seasonId=${selectedSeasonId}` : "";
      const res = await fetch(`/api/matches${query}`);
      if (!res.ok) throw new Error("Failed to fetch matches");
      const data = await res.json();
      setMatches(data);
    } catch {
      toast.error("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [selectedSeasonId]);

  async function fetchSeasons() {
    try {
      const res = await fetch("/api/seasons");
      if (!res.ok) throw new Error("Failed to fetch seasons");
      const data: Season[] = await res.json();
      setSeasons(data);
      const preferred = data.find((season) => season.status === "active") ?? data[0];
      if (preferred) setSelectedSeasonId((current) => current || preferred.id.toString());
      else setLoading(false);
    } catch {
      toast.error("Failed to load seasons");
      setLoading(false);
    }
  }

  async function fetchPlayers() {
    try {
      const res = await fetch("/api/players");
      if (!res.ok) throw new Error("Failed to fetch players");
      const data = await res.json();
      setPlayers(data);
    } catch {
      toast.error("Failed to load players");
    }
  }

  useEffect(() => {
    fetchSeasons();
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) fetchMatches();
  }, [selectedSeasonId, fetchMatches]);

  function openCreateDialog() {
    setEditingMatch(null);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      time: "19:00",
      price: "10",
      location: "",
      pitch: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(match: Match) {
    setEditingMatch(match);
    setFormData({
      date: match.date,
      time: match.time,
      price: match.price.toString(),
      location: match.location,
      pitch: match.pitch,
    });
    setDialogOpen(true);
  }

  function openViewTeamsDialog(match: Match) {
    setViewTeamsMatch(match);
    setViewTeamsDialogOpen(true);
  }

  function openTeamsDialog(match: Match) {
    setTeamsMatch(match);
    setTeamA(match.teamA);
    setTeamB(match.teamB);
    setAttendees(Array.from(new Set([...match.teamA, ...match.teamB])));
    setBalanceSummary(null);
    setTeamsDialogOpen(true);
  }

  function openDeleteDialog(match: Match) {
    setDeletingMatch(match);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const payload = {
        date: formData.date,
        time: formData.time,
        price: parseFloat(formData.price),
        location: formData.location,
        pitch: formData.pitch,
      };

      if (editingMatch) {
        const res = await fetch(`/api/matches/${editingMatch.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update match");
        toast.success("Match updated");
      } else {
        const res = await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create match");
        toast.success("Match created");
      }
      setDialogOpen(false);
      fetchMatches();
    } catch {
      toast.error(
        editingMatch ? "Failed to update match" : "Failed to create match",
      );
    }
  }

  async function handleSaveTeams() {
    if (!teamsMatch) return;

    try {
      const res = await fetch(`/api/matches/${teamsMatch.id}/teams`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamA, teamB }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save teams");
        return;
      }
      toast.success("Teams saved");
      setTeamsDialogOpen(false);
      fetchMatches();
    } catch {
      toast.error("Failed to save teams");
    }
  }

  async function handleRandomize() {
    if (!teamsMatch || attendees.length === 0) {
      toast.error("Select players first");
      return;
    }

    try {
      const res = await fetch(`/api/matches/${teamsMatch.id}/randomize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendees, teamA, teamB }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to randomize teams");
        return;
      }
      setTeamA(data.teamA);
      setTeamB(data.teamB);
      setBalanceSummary(null);
      toast.success("Teams randomized");
    } catch {
      toast.error("Failed to randomize teams");
    }
  }

  async function handleBalance() {
    if (!teamsMatch || attendees.length === 0) {
      toast.error("Select players first");
      return;
    }

    try {
      const res = await fetch(`/api/matches/${teamsMatch.id}/randomize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendees, method: "balance" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to balance teams");
        return;
      }
      setTeamA(data.teamA);
      setTeamB(data.teamB);
      setBalanceSummary(data.balance ?? null);
      toast.success("Teams balanced");
    } catch {
      toast.error("Failed to balance teams");
    }
  }

  async function handleSaveResult(
    matchId: number,
    result: { winner: Winner; scoreA: number | null; scoreB: number | null },
  ) {
    try {
      const normalized = normalizeResult(result);
      const res = await fetch(`/api/matches/${matchId}/winner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save result");
        return;
      }
      toast.success(normalized.winner === "Not Played" ? "Result cleared" : "Result saved");
      setResultMatch(null);
      fetchMatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save result");
    }
  }

  async function handleDelete() {
    if (!deletingMatch) return;

    try {
      const res = await fetch(`/api/matches/${deletingMatch.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete match");
      toast.success("Match deleted");
      setDeleteDialogOpen(false);
      setDeletingMatch(null);
      fetchMatches();
    } catch {
      toast.error("Failed to delete match");
    }
  }

  function clearBalanceSummary() {
    setBalanceSummary(null);
  }

  function toggleAttendee(playerId: number) {
    clearBalanceSummary();
    if (attendees.includes(playerId)) {
      setAttendees(attendees.filter((id) => id !== playerId));
      setTeamA(teamA.filter((id) => id !== playerId));
      setTeamB(teamB.filter((id) => id !== playerId));
    } else {
      setAttendees([...attendees, playerId]);
    }
  }

  function addToTeamA(playerId: number) {
    clearBalanceSummary();
    console.log("addToTeamA", playerId);
    console.log("teamA", teamA);
    setAttendees((prev) =>
      prev.includes(playerId) ? prev : [...prev, playerId],
    );
    setTeamA((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
    setTeamB((prev) => prev.filter((id) => id !== playerId));
  }

  function addToTeamB(playerId: number) {
    clearBalanceSummary();
    console.log("addToTeamB", playerId);
    console.log("teamB", teamB);
    setAttendees((prev) =>
      prev.includes(playerId) ? prev : [...prev, playerId],
    );
    setTeamB((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
    setTeamA((prev) => prev.filter((id) => id !== playerId));
  }

  function removeFromTeamA(playerId: number) {
    clearBalanceSummary();
    setTeamA((prev) => prev.filter((id) => id !== playerId));
  }

  function removeFromTeamB(playerId: number) {
    clearBalanceSummary();
    setTeamB((prev) => prev.filter((id) => id !== playerId));
  }

  function getPlayer(id: number) {
    return players.find((p) => p.id === id);
  }

  const availablePlayers = players.filter(
    (p) =>
      p.active &&
      attendees.includes(p.id) &&
      !teamA.includes(p.id) &&
      !teamB.includes(p.id),
  );
  const activePlayers = players.filter((player) => player.active);
  const activeSeason = seasons.find((season) => season.status === "active");

  function getPlayerName(id: number) {
    return players.find((p) => p.id === id)?.name ?? `Player ${id}`;
  }

  function formatTeams(match: Match) {
    if (match.teamA.length === 0 && match.teamB.length === 0) {
      return "No teams assigned";
    }
    return `${match.teamA.length} vs ${match.teamB.length}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Choose season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.id.toString()}>
                  {season.name} · {season.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateDialog} disabled={!activeSeason}>
            <IconPlus className="h-4 w-4 mr-2" />
            Create Match
          </Button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-3xl bg-card py-8 text-center text-muted-foreground shadow-sm">Loading...</div>
        ) : matches.length === 0 ? (
          <div className="rounded-3xl bg-card px-4 py-8 text-center text-muted-foreground shadow-sm">
            No matches yet. Create one to get started.
          </div>
        ) : (
          matches.map((match) => {
            const canRecord = match.teamA.length + match.teamB.length > 0;
            return (
              <div key={match.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{match.date}</div>
                    <div className="text-sm text-muted-foreground">
                      {match.time}
                      {match.location ? ` · ${match.location}` : ""}
                      {match.pitch ? ` · ${match.pitch}` : ""}
                    </div>
                  </div>
                  <div className="text-sm">{formatGBP(match.price)}</div>
                </div>
                <div className="text-sm text-muted-foreground">{formatTeams(match)}</div>
                <Button
                  variant="outline"
                  className="h-12 w-full text-sm"
                  disabled={!canRecord}
                  onClick={() => setResultMatch(match)}
                >
                  {canRecord ? formatResult(match) : "Assign teams first"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-11" onClick={() => openViewTeamsDialog(match)}>
                    View
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => openTeamsDialog(match)}>
                    Teams
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => openEditDialog(match)}>
                    Edit
                  </Button>
                  <Button variant="outline" className="h-11" onClick={() => openDeleteDialog(match)}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : matches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No matches yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              matches.map((match) => (
                <TableRow key={match.id}>
                  <TableCell className="font-medium">{match.date}</TableCell>
                  <TableCell>
                    {match.location || match.pitch ? (
                      <span>
                        {match.location}
                        {match.location && match.pitch && " — "}
                        {match.pitch && (
                          <span className="text-muted-foreground">
                            {match.pitch}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatGBP(match.price)}
                  </TableCell>
                  <TableCell>{formatTeams(match)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      className="h-10"
                      disabled={match.teamA.length + match.teamB.length === 0}
                      onClick={() => setResultMatch(match)}
                    >
                      {match.teamA.length + match.teamB.length === 0
                        ? "No teams"
                        : formatResult(match)}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewTeamsDialog(match)}
                        title="View Teams"
                      >
                        <IconEye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openTeamsDialog(match)}
                        title="Assign Teams"
                      >
                        <IconTrophy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(match)}
                        title="Edit"
                      >
                        <IconPencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(match)}
                        title="Delete"
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMatch ? "Edit Match" : "Create Match"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Match cost (£)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="e.g. GOALS Bristol South"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pitch">Pitch</Label>
                <Input
                  id="pitch"
                  type="text"
                  placeholder="e.g. Pitch 3"
                  value={formData.pitch}
                  onChange={(e) =>
                    setFormData({ ...formData, pitch: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingMatch ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={teamsDialogOpen} onOpenChange={setTeamsDialogOpen}>
        <DialogContent ref={teamsDialogContentRef} className="max-h-[90vh] w-full max-w-4xl overflow-y-auto sm:min-w-[70%]">
          <DialogHeader>
            <DialogTitle>Assign Teams</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">
                Who&apos;s Playing? ({attendees.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {activePlayers.map((player) => {
                  const isSelected = attendees.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggleAttendee(player.id)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {player.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {attendees.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">Assign Teams</h3>
                    <p className="text-xs text-muted-foreground">
                      Balance re-splits everyone selected using this season&apos;s win rate.
                      It changes a little each time and does not keep positions even.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <Button variant="outline" size="sm" onClick={handleRandomize}>
                      <IconArrowsShuffle2 className="h-4 w-4 mr-2" />
                      Randomize
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBalance}>
                      <IconScale className="h-4 w-4 mr-2" />
                      Balance
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">
                      Team A ({teamA.length})
                      {balanceSummary
                        ? ` · ${formatWinRate(balanceSummary.teamAWinRate)}`
                        : ""}
                    </h4>
                    <Combobox
                      items={availablePlayers}
                      inputValue={teamAInput}
                      onInputValueChange={(val) => setTeamAInput(val)}
                      onValueChange={(player: Player | null) => {
                        if (player) {
                          addToTeamA(player.id);
                          setTeamAInput("");
                        }
                      }}
                    >
                      <ComboboxInput
                        placeholder="Add player..."
                        className="w-full"
                      />
                      <ComboboxContent
                        container={teamsDialogContentRef.current}
                      >
                        <ComboboxList>
                          {(player: Player) => (
                            <ComboboxItem key={player.id} value={player}>
                              {player.name}
                              <span className="text-muted-foreground ml-1">
                                ({player.position})
                              </span>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                        <ComboboxEmpty>No players available</ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                    <div className="space-y-1 min-h-[100px]">
                      {teamA.map((playerId) => {
                        const player = getPlayer(playerId);
                        const rating = balanceSummary?.players.find((entry) => entry.id === playerId);
                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <span>
                              {player?.name ?? `Player ${playerId}`}
                              <span
                                className="text-muted-foreground ml-1"
                                title={
                                  rating?.matchesPlayed === 0
                                    ? "No games this season, counted as 50%"
                                    : undefined
                                }
                              >
                                ({player?.position}
                                {rating ? ` · ${formatWinRate(rating.winRate)}` : ""})
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFromTeamA(playerId)}
                            >
                              <IconX className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">
                      Team B ({teamB.length})
                      {balanceSummary
                        ? ` · ${formatWinRate(balanceSummary.teamBWinRate)}`
                        : ""}
                    </h4>
                    <Combobox
                      items={availablePlayers}
                      inputValue={teamBInput}
                      onInputValueChange={(val) => setTeamBInput(val)}
                      onValueChange={(player: Player | null) => {
                        if (player) {
                          addToTeamB(player.id);
                          setTeamBInput("");
                        }
                      }}
                    >
                      <ComboboxInput
                        placeholder="Add player..."
                        className="w-full"
                      />
                      <ComboboxContent
                        container={teamsDialogContentRef.current}
                      >
                        <ComboboxList>
                          {(player: Player) => (
                            <ComboboxItem key={player.id} value={player}>
                              {player.name}
                              <span className="text-muted-foreground ml-1">
                                ({player.position})
                              </span>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                        <ComboboxEmpty>No players available</ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                    <div className="space-y-1 min-h-[100px]">
                      {teamB.map((playerId) => {
                        const player = getPlayer(playerId);
                        const rating = balanceSummary?.players.find((entry) => entry.id === playerId);
                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <span>
                              {player?.name ?? `Player ${playerId}`}
                              <span
                                className="text-muted-foreground ml-1"
                                title={
                                  rating?.matchesPlayed === 0
                                    ? "No games this season, counted as 50%"
                                    : undefined
                                }
                              >
                                ({player?.position}
                                {rating ? ` · ${formatWinRate(rating.winRate)}` : ""})
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFromTeamB(playerId)}
                            >
                              <IconX className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeams}>Save Teams</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Match</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete the match on{" "}
            <strong>{deletingMatch?.date}</strong>? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewTeamsDialogOpen} onOpenChange={setViewTeamsDialogOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Match Details</DialogTitle>
          </DialogHeader>
          {viewTeamsMatch && (
            <div className="space-y-6 py-4">
              <div className="space-y-2 text-sm divide-y gap-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {new Date(viewTeamsMatch.date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{viewTeamsMatch.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">
                    {viewTeamsMatch.location || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pitch</span>
                  <span className="font-medium">
                    {viewTeamsMatch.pitch || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Result</span>
                  <span className="font-medium">{formatResult(viewTeamsMatch)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium">
                    {formatGBP(viewTeamsMatch.price)} (
                    {formatGBP(
                      viewTeamsMatch.price /
                        (viewTeamsMatch.teamA.length +
                          viewTeamsMatch.teamB.length),
                    )}{" "}
                    ea.)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Team A (Light)</h4>
                  <div className="space-y-1">
                    {viewTeamsMatch.teamA.map((playerId, index) => (
                      <div
                        key={playerId}
                        className="flex flex-row items-center text-sm p-1 bg-muted/80 gap-2"
                      >
                        <span className="w-5 h-5 bg-white flex justify-center items-center">
                          {index + 1}
                        </span>{" "}
                        {getPlayerName(playerId)}
                      </div>
                    ))}
                    {viewTeamsMatch.teamA.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No players
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Team B (Dark)</h4>
                  <div className="space-y-1">
                    {viewTeamsMatch.teamB.map((playerId, index) => (
                      <div
                        key={playerId}
                        className="flex flex-row items-center text-sm p-1 bg-black/70 gap-2 text-white"
                      >
                        <span className="w-5 h-5 bg-white flex justify-center items-center text-black">
                          {index + 1}
                        </span>{" "}
                        {getPlayerName(playerId)}
                      </div>
                    ))}
                    {viewTeamsMatch.teamB.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No players
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewTeamsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecordResultDialog
        match={resultMatch}
        open={resultMatch !== null}
        onOpenChange={(open) => {
          if (!open) setResultMatch(null);
        }}
        onSave={handleSaveResult}
      />
    </div>
  );
}
