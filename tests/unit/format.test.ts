import { describe, expect, it } from "vitest";

import {
  formatAccuracy,
  formatCompact,
  formatDate,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPlaytime,
  formatPp,
  formatRank,
  formatRelative,
  formatStars,
  hitBreakdown,
  isStillActive,
  toDate,
} from "@/lib/format";

describe("numbers", () => {
  it("groups thousands", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(0)).toBe("0");
  });

  it("shows a dash rather than NaN for missing values", () => {
    expect(formatNumber(null)).toBe("–");
    expect(formatNumber(undefined)).toBe("–");
    expect(formatNumber(Number.NaN)).toBe("–");
    expect(formatPp(null)).toBe("–");
    expect(formatAccuracy(undefined)).toBe("–");
    expect(formatStars(null)).toBe("–");
  });

  it("rounds pp to whole points, as osu! displays it", () => {
    expect(formatPp(14524.6)).toBe("14,525");
    expect(formatPp(0.4)).toBe("0");
  });

  it("formats accuracy and stars to fixed precision", () => {
    expect(formatAccuracy(95.7)).toBe("95.70%");
    expect(formatAccuracy(95.7, 0)).toBe("96%");
    expect(formatStars(6.9412)).toBe("6.94");
  });

  it("compacts large counts", () => {
    expect(formatCompact(12400)).toBe("12.4K");
    expect(formatCompact(1500000)).toBe("1.5M");
  });

  it("prefixes ranks and rejects unranked", () => {
    expect(formatRank(1)).toBe("#1");
    expect(formatRank(12345)).toBe("#12,345");
    // bancho.py reports an unranked player as 0 in v1 and null in v2
    expect(formatRank(0)).toBe("–");
    expect(formatRank(null)).toBe("–");
  });
});

describe("durations", () => {
  it("formats beatmap lengths as minutes and seconds", () => {
    expect(formatDuration(247)).toBe("4:07");
    expect(formatDuration(62)).toBe("1:02");
    expect(formatDuration(9)).toBe("0:09");
  });

  it("adds hours only when needed", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("formats total play time in hours and minutes", () => {
    expect(formatPlaytime(1857920)).toBe("516h 5m");
    expect(formatPlaytime(600)).toBe("10m");
    expect(formatPlaytime(0)).toBe("0h");
    expect(formatPlaytime(null)).toBe("0h");
  });
});

describe("dates", () => {
  it("reads unix seconds, which bancho.py uses for account fields", () => {
    const date = toDate(1712707200);
    expect(date?.toISOString()).toBe("2024-04-10T00:00:00.000Z");
    expect(formatDate(1712707200)).toBe("Apr 10, 2024");
  });

  it("treats naive datetimes from the API as UTC", () => {
    // the v2 API serialises play_time without a timezone offset
    expect(toDate("2026-06-20T08:12:18")?.toISOString()).toBe("2026-06-20T08:12:18.000Z");
    expect(formatDateTime("2026-06-20T08:12:18")).toBe("Jun 20, 2026, 08:12 AM UTC");
  });

  it("keeps an explicit offset when one is present", () => {
    expect(toDate("2026-06-20T08:12:18Z")?.toISOString()).toBe("2026-06-20T08:12:18.000Z");
  });

  it("treats zero and missing timestamps as absent", () => {
    expect(toDate(0)).toBeNull();
    expect(toDate(null)).toBeNull();
    expect(toDate("not a date")).toBeNull();
    expect(formatDate(0)).toBe("–");
  });

  it("describes relative times against a fixed now", () => {
    const now = Date.parse("2026-07-25T12:00:00Z");
    expect(formatRelative("2026-07-25T11:59:40", now)).toBe("just now");
    expect(formatRelative("2026-07-25T09:00:00", now)).toBe("3 hours ago");
    expect(formatRelative("2026-07-22T12:00:00", now)).toBe("3 days ago");
    expect(formatRelative("2026-05-25T12:00:00", now)).toBe("2 months ago");
    expect(formatRelative(null, now)).toBe("never");
  });

  it("knows whether a supporter period is still running", () => {
    expect(isStillActive(0)).toBe(false);
    expect(isStillActive(null)).toBe(false);
    // one year before/after the epoch second used above
    expect(isStillActive(Math.floor(Date.now() / 1000) + 86400)).toBe(true);
    expect(isStillActive(Math.floor(Date.now() / 1000) - 86400)).toBe(false);
  });
});

describe("hit breakdown", () => {
  const score = { n300: 1000, n100: 50, n50: 5, nmiss: 2, ngeki: 120, nkatu: 30 };

  it("uses each ruleset's own judgement names", () => {
    expect(hitBreakdown(score, 0).map((hit) => hit.label)).toEqual(["300", "100", "50", "Miss"]);
    expect(hitBreakdown(score, 1).map((hit) => hit.label)).toEqual(["Great", "Good", "Miss"]);
    expect(hitBreakdown(score, 2).map((hit) => hit.label)).toEqual([
      "Fruit",
      "Drop",
      "Droplet",
      "Miss",
    ]);
    expect(hitBreakdown(score, 3).map((hit) => hit.label)).toEqual([
      "Rainbow",
      "300",
      "200",
      "100",
      "50",
      "Miss",
    ]);
  });

  it("maps mania's rainbow 300 and 200 onto geki and katu", () => {
    const mania = hitBreakdown(score, 3);
    expect(mania[0].value).toBe(score.ngeki);
    expect(mania[2].value).toBe(score.nkatu);
  });

  it("gives every judgement a distinct colour", () => {
    const colors = hitBreakdown(score, 0).map((hit) => hit.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
