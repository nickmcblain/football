import { describe, expect, test } from "bun:test";
import { pickUpcomingMatch } from "./fixtures";

describe("pickUpcomingMatch", () => {
  test("returns the earliest match that has not been played", () => {
    const match = pickUpcomingMatch([
      { id: 2, date: "2026-04-02", time: "19:00", winner: "Not Played" },
      { id: 1, date: "2026-03-20", time: "19:00", winner: "Team A" },
      { id: 3, date: "2026-03-27", time: "20:00", winner: "Not Played" },
    ]);
    expect(match?.id).toBe(3);
  });

  test("returns null when every match has a result", () => {
    expect(
      pickUpcomingMatch([{ id: 1, date: "2026-03-20", time: "19:00", winner: "Draw" }]),
    ).toBeNull();
  });
});
