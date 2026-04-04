// tests/booking.test.js
import { describe, expect, test } from "@jest/globals";

const canReserveAllSessions = (sessions) =>
  sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

describe("canReserveAllSessions", () => {
  test("returns true if all sessions have remaining capacity", () => {
    const sessions = [
      { capacity: 10, bookedCount: 9 },
      { capacity: 20, bookedCount: 0 },
    ];
    expect(canReserveAllSessions(sessions)).toBe(true);
  });

  test("returns false if any session is full", () => {
    // const sessions = [{ capacity: 10, bookedCount:  10],
    const sessions = [
      { capacity: 10, bookedCount: 10 },
      { capacity: 20, bookedCount: 0 },
    ];
    expect(canReserveAllSessions(sessions)).toBe(false);
  });

  test("returns false if any session is overbooked", () => {
    const sessions = [
      { capacity: 10, bookedCount: 11 },
      { capacity: 20, bookedCount: 0 },
    ];
    expect(canReserveAllSessions(sessions)).toBe(false);
  });

  test("handles sessions with undefined bookedCount", () => {
    const sessions = [{ capacity: 10 }, { capacity: 20, bookedCount: 5 }];
    expect(canReserveAllSessions(sessions)).toBe(true);
  });
});
