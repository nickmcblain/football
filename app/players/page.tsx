"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { IconArchive, IconPlus, IconPencil, IconRestore } from "@tabler/icons-react"
import { Player, Position } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const positions: Position[] = ["Attack", "Midfield", "Defense"]
const formatGBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)
  const [formData, setFormData] = useState({ name: "", position: "Midfield" as Position })

  async function fetchPlayers() {
    try {
      const res = await fetch("/api/players")
      if (!res.ok) throw new Error("Failed to fetch players")
      const data = await res.json()
      setPlayers(data)
    } catch {
      toast.error("Failed to load players")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [])

  function openCreateDialog() {
    setEditingPlayer(null)
    setFormData({ name: "", position: "Midfield" })
    setDialogOpen(true)
  }

  function openEditDialog(player: Player) {
    setEditingPlayer(player)
    setFormData({ name: player.name, position: player.position })
    setDialogOpen(true)
  }

  function openDeleteDialog(player: Player) {
    setDeletingPlayer(player)
    setDeleteDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      if (editingPlayer) {
        const res = await fetch(`/api/players/${editingPlayer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error("Failed to update player")
        toast.success("Player updated")
      } else {
        const res = await fetch("/api/players", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error("Failed to create player")
        toast.success("Player created")
      }
      setDialogOpen(false)
      fetchPlayers()
    } catch {
      toast.error(editingPlayer ? "Failed to update player" : "Failed to create player")
    }
  }

  async function handleDelete() {
    if (!deletingPlayer) return
    
    try {
      const res = await fetch(`/api/players/${deletingPlayer.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete player")
      toast.success("Player archived")
      setDeleteDialogOpen(false)
      setDeletingPlayer(null)
      fetchPlayers()
    } catch {
      toast.error("Failed to delete player")
    }
  }

  async function handleRestore(player: Player) {
    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      })
      if (!res.ok) throw new Error("Failed to restore player")
      toast.success(`${player.name} restored`)
      fetchPlayers()
    } catch {
      toast.error("Failed to restore player")
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
        <Button onClick={openCreateDialog}>
          <IconPlus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </div>

      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="rounded-3xl bg-card py-8 text-center text-muted-foreground shadow-sm">Loading...</div>
        ) : players.length === 0 ? (
          <div className="rounded-3xl bg-card px-4 py-8 text-center text-muted-foreground shadow-sm">
            No players yet. Add one to get started.
          </div>
        ) : (
          players.map((player) => (
            <div key={player.id} className="rounded-3xl bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{player.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {player.position} · {formatGBP(player.totalOwed)} owed
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{player.points} pts</div>
                  <div className="text-muted-foreground">{player.active ? "Active" : "Archived"}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => openEditDialog(player)}>
                  Edit
                </Button>
                {player.active ? (
                  <Button variant="outline" className="flex-1" onClick={() => openDeleteDialog(player)}>
                    Archive
                  </Button>
                ) : (
                  <Button variant="outline" className="flex-1" onClick={() => handleRestore(player)}>
                    Restore
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Total Owed</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No players yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{player.position}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{player.points}</TableCell>
                  <TableCell className="text-right">{formatGBP(player.totalOwed)}</TableCell>
                  <TableCell>
                    <Badge variant={player.paid ? "default" : "destructive"}>
                      {player.paid ? "Paid" : "Unpaid"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={player.active ? "default" : "secondary"}>
                      {player.active ? "Active" : "Archived"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(player)}
                      >
                        <IconPencil className="h-4 w-4" />
                      </Button>
                      {player.active ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(player)}
                          title="Archive"
                        >
                          <IconArchive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestore(player)}
                          title="Restore"
                        >
                          <IconRestore className="h-4 w-4" />
                        </Button>
                      )}
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
            <DialogTitle>{editingPlayer ? "Edit Player" : "Add Player"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter player name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value: Position) => setFormData({ ...formData, position: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPlayer ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Player</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Archive <strong>{deletingPlayer?.name}</strong>? Their history will stay in past
            matches and leaderboards, but they will no longer be available for new teams.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
