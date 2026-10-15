import { describe, expect, it } from "vitest";

import {
  BADGES,
  XP_PER_LEVEL,
  eventTypeLabel,
  formatPrice,
  isRsvpType,
  levelFromXp,
  levelProgress,
  xpToNextLevel,
} from "@/lib/collaxp";

describe("XP and levels", () => {
  it("starts everyone at level 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(XP_PER_LEVEL - 1)).toBe(1);
  });

  it("levels up every 250 XP", () => {
    expect(levelFromXp(XP_PER_LEVEL)).toBe(2);
    expect(levelFromXp(XP_PER_LEVEL * 4)).toBe(5);
  });

  it("never returns a level below 1, even for negative XP", () => {
    expect(levelFromXp(-100)).toBe(1);
  });

  it("calculates progress to the next level as a percentage", () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(125)).toBe(50);
    expect(levelProgress(XP_PER_LEVEL)).toBe(0);
  });

  it("calculates XP remaining to the next level", () => {
    expect(xpToNextLevel(0)).toBe(XP_PER_LEVEL);
    expect(xpToNextLevel(200)).toBe(50);
  });
});

describe("formatPrice", () => {
  it("shows Free for zero or negative prices", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(-5)).toBe("Free");
  });

  it("formats paid prices in rand with two decimals", () => {
    expect(formatPrice(50)).toBe("R50.00");
    expect(formatPrice(99.5)).toBe("R99.50");
  });
});

describe("event types", () => {
  it("treats seminars and rallies as RSVP events", () => {
    expect(isRsvpType("seminar")).toBe(true);
    expect(isRsvpType("rally")).toBe(true);
  });

  it("treats ticketed, empty and missing types as non-RSVP", () => {
    expect(isRsvpType("ticketed")).toBe(false);
    expect(isRsvpType(null)).toBe(false);
    expect(isRsvpType(undefined)).toBe(false);
  });

  it("returns readable labels and defaults to ticketed", () => {
    expect(eventTypeLabel("seminar")).toBe("Seminar (RSVP)");
    expect(eventTypeLabel("unknown")).toBe("Ticketed event");
    expect(eventTypeLabel(null)).toBe("Ticketed event");
  });
});

describe("badges", () => {
  it("are ordered by increasing requirement", () => {
    const reqs = BADGES.map((b) => b.requirement);
    expect(reqs).toEqual([...reqs].sort((a, b) => a - b));
  });
});
