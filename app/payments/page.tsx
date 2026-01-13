"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { PaymentMatrix } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const formatGBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format

export default function PaymentsPage() {
  const [matrix, setMatrix] = useState<PaymentMatrix | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPayments() {
    try {
      const res = await fetch("/api/payments")
      if (!res.ok) throw new Error("Failed to fetch payments")
      const data = await res.json()
      setMatrix(data)
    } catch {
      toast.error("Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  async function togglePayment(playerId: number, matchId: number, currentPaid: boolean) {
    try {
      const res = await fetch(`/api/payments/${playerId}/${matchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: !currentPaid }),
      })
      if (!res.ok) throw new Error("Failed to update payment")
      toast.success(currentPaid ? "Marked as unpaid" : "Marked as paid")
      fetchPayments()
    } catch {
      toast.error("Failed to update payment")
    }
  }

  async function markAllPaid(playerId: number) {
    try {
      const res = await fetch(`/api/payments/${playerId}/mark-all-paid`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to mark all paid")
      toast.success("All payments marked as paid")
      fetchPayments()
    } catch {
      toast.error("Failed to mark all paid")
    }
  }

  function getPayment(playerId: number, matchId: number) {
    return matrix?.payments.find((p) => p.playerId === playerId && p.matchId === matchId)
  }

  function getPlayerTotal(playerId: number) {
    return matrix?.totals.find((t) => t.playerId === playerId)?.totalOwed ?? 0
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track player payments per match</p>
        </div>
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!matrix || matrix.players.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track player payments per match</p>
        </div>
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No payment data yet. Create matches and assign players to see the payment matrix.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">Track player payments per match</p>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background">Player</TableHead>
              {matrix.matches.map((match) => (
                <TableHead key={match.id} className="text-center min-w-[100px]">
                  <div>{match.date}</div>
                  <div className="text-xs text-muted-foreground">{formatGBP(match.price)}</div>
                </TableHead>
              ))}
              <TableHead className="text-right">Total Owed</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.players.map((player) => {
              const totalOwed = getPlayerTotal(player.id)
              return (
                <TableRow key={player.id}>
                  <TableCell className="sticky left-0 bg-background font-medium">
                    {player.name}
                  </TableCell>
                  {matrix.matches.map((match) => {
                    const payment = getPayment(player.id, match.id)
                    if (!payment) {
                      return (
                        <TableCell key={match.id} className="text-center">
                          <span className="text-muted-foreground">-</span>
                        </TableCell>
                      )
                    }
                    return (
                      <TableCell key={match.id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Checkbox
                            checked={payment.paid}
                            onCheckedChange={() => togglePayment(player.id, match.id, payment.paid)}
                          />
                          <span
                            className={cn(
                              "text-xs",
                              payment.paid ? "text-muted-foreground line-through" : "text-foreground"
                            )}
                          >
                            {formatGBP(payment.amountOwed)}
                          </span>
                        </div>
                      </TableCell>
                    )
                  })}
                  <TableCell
                    className={cn(
                      "text-right font-bold",
                      totalOwed > 0 ? "text-destructive" : "text-green-600"
                    )}
                  >
                    {formatGBP(totalOwed)}
                  </TableCell>
                  <TableCell>
                    {totalOwed > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAllPaid(player.id)}
                      >
                        Pay All
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
