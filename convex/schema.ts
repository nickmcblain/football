import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const positionValidator = v.union(
  v.literal("Attack"),
  v.literal("Midfield"),
  v.literal("Defense")
);

const winnerValidator = v.union(
  v.literal("Team A"),
  v.literal("Team B"),
  v.literal("Draw"),
  v.literal("Not Played")
);

export default defineSchema({
  players: defineTable({
    legacyId: v.number(),
    name: v.string(),
    position: positionValidator,
    points: v.number(),
    totalOwed: v.number(),
    paid: v.boolean(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_name", ["name"])
    .index("by_points", ["points"]),

  matches: defineTable({
    legacyId: v.number(),
    date: v.string(),
    time: v.string(),
    price: v.number(),
    location: v.string(),
    pitch: v.string(),
    teamA: v.array(v.number()),
    teamB: v.array(v.number()),
    winner: winnerValidator,
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_date", ["date"]),

  payments: defineTable({
    legacyId: v.number(),
    playerId: v.number(),
    matchId: v.number(),
    amountOwed: v.number(),
    paid: v.boolean(),
  })
    .index("by_legacy_id", ["legacyId"])
    .index("by_player_id", ["playerId"])
    .index("by_match_id", ["matchId"])
    .index("by_player_match", ["playerId", "matchId"]),

  metadata: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),
});
