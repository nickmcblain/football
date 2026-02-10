"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconArrowsShuffle2,
  IconTrophy,
  IconEye,
} from "@tabler/icons-react";
import { Match, Player, Winner } from "@/lib/types";
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

const winnerOptions: Winner[] = ["Team A", "Team B", "Draw", "Not Played"];
const formatGBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
}).format;

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
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
  const teamsDialogContentRef = useRef<HTMLDivElement>(null);

  async function fetchMatches() {
    try {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to fetch matches");
      const data = await res.json();
      setMatches(data);
    } catch {
      toast.error("Failed to load matches");
    } finally {
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
    fetchMatches();
    fetchPlayers();
  }, []);

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
      toast.success("Teams randomized");
    } catch {
      toast.error("Failed to randomize teams");
    }
  }

  async function handleSetWinner(matchId: number, winner: Winner) {
    try {
      const res = await fetch(`/api/matches/${matchId}/winner`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner }),
      });
      if (!res.ok) throw new Error("Failed to set winner");
      toast.success("Winner set");
      fetchMatches();
    } catch {
      toast.error("Failed to set winner");
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

  function toggleAttendee(playerId: number) {
    if (attendees.includes(playerId)) {
      setAttendees(attendees.filter((id) => id !== playerId));
      setTeamA(teamA.filter((id) => id !== playerId));
      setTeamB(teamB.filter((id) => id !== playerId));
    } else {
      setAttendees([...attendees, playerId]);
    }
  }

  function addToTeamA(playerId: number) {
    console.log("addToTeamA", playerId);
    console.log("teamA", teamA);
    setAttendees((prev) =>
      prev.includes(playerId) ? prev : [...prev, playerId],
    );
    setTeamA((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
    setTeamB((prev) => prev.filter((id) => id !== playerId));
  }

  function addToTeamB(playerId: number) {
    console.log("addToTeamB", playerId);
    console.log("teamB", teamB);
    setAttendees((prev) =>
      prev.includes(playerId) ? prev : [...prev, playerId],
    );
    setTeamB((prev) => (prev.includes(playerId) ? prev : [...prev, playerId]));
    setTeamA((prev) => prev.filter((id) => id !== playerId));
  }

  function removeFromTeamA(playerId: number) {
    setTeamA((prev) => prev.filter((id) => id !== playerId));
  }

  function removeFromTeamB(playerId: number) {
    setTeamB((prev) => prev.filter((id) => id !== playerId));
  }

  function getPlayer(id: number) {
    return players.find((p) => p.id === id);
  }

  const availablePlayers = players.filter(
    (p) =>
      attendees.includes(p.id) &&
      !teamA.includes(p.id) &&
      !teamB.includes(p.id),
  );

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Matches</h1>
        <Button onClick={openCreateDialog}>
          <IconPlus className="h-4 w-4 mr-2" />
          Create Match
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Winner</TableHead>
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
                    <Select
                      value={match.winner}
                      onValueChange={(value: Winner) =>
                        handleSetWinner(match.id, value)
                      }
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {winnerOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
        <DialogContent ref={teamsDialogContentRef} className="min-w-[70%]">
          <DialogHeader>
            <DialogTitle>Assign Teams</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">
                Who&apos;s Playing? ({attendees.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => {
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
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Assign Teams</h3>
                  <Button variant="outline" size="sm" onClick={handleRandomize}>
                    <IconArrowsShuffle2 className="h-4 w-4 mr-2" />
                    Randomize
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">
                      Team A ({teamA.length})
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
                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <span>
                              {player?.name ?? `Player ${playerId}`}
                              <span className="text-muted-foreground ml-1">
                                ({player?.position})
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
                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <span>
                              {player?.name ?? `Player ${playerId}`}
                              <span className="text-muted-foreground ml-1">
                                ({player?.position})
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
        <DialogContent className="min-w-lg" showCloseButton={false}>
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

              <div className="grid grid-cols-2 gap-6">
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
    </div>
  );
}
