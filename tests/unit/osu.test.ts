import { describe, expect, it } from "vitest";

import { difficultyColor, difficultyTier, isScoreable, statusLabel } from "@/lib/osu/beatmaps";
import { countryName, COUNTRY_OPTIONS } from "@/lib/osu/countries";
import {
  MODE_LIST,
  modeFromSlug,
  modeInfo,
  toMode,
  VALID_MODES,
  vanillaMode,
} from "@/lib/osu/gamemodes";
import { gradeStyle, scoreStatusLabel } from "@/lib/osu/grades";
import { decomposeMods, MODS, modsToString } from "@/lib/osu/mods";
import {
  clanRankLabel,
  isRestricted,
  isStaff,
  isSupporter,
  playStyleLabels,
  PRIVILEGES,
  roleBadges,
} from "@/lib/osu/privileges";

/**
 * These mirror bancho.py's own constants. If the server ever changes them,
 * these tests are where the mismatch should surface.
 */

describe("game modes", () => {
  it("covers exactly the modes bancho.py accepts", () => {
    // 7 (relax mania) and 9-11 (autopilot taiko/catch/mania) are rejected
    expect([...VALID_MODES]).toEqual([0, 1, 2, 3, 4, 5, 6, 8]);
    expect(MODE_LIST).toHaveLength(8);
  });

  it("falls back to vanilla osu! for unusable input", () => {
    expect(toMode(7)).toBe(0);
    expect(toMode(11)).toBe(0);
    expect(toMode("4")).toBe(4);
    expect(toMode(null)).toBe(0);
    expect(toMode("nonsense")).toBe(0);
  });

  it("maps each mode to its underlying ruleset", () => {
    expect(vanillaMode(0)).toBe(0);
    expect(vanillaMode(4)).toBe(0); // relax osu!
    expect(vanillaMode(5)).toBe(1); // relax taiko
    expect(vanillaMode(6)).toBe(2); // relax catch
    expect(vanillaMode(8)).toBe(0); // autopilot osu!
    expect(vanillaMode(3)).toBe(3);
  });

  it("gives every mode a distinct short label", () => {
    const labels = MODE_LIST.map((mode) => mode.shortName);
    expect(new Set(labels).size).toBe(labels.length);
    expect(modeInfo(4).shortName).toBe("osu! rx");
    expect(modeInfo(8).fullName).toBe("osu! (Autopilot)");
  });

  it("round-trips slugs", () => {
    for (const mode of MODE_LIST) {
      expect(modeFromSlug(mode.slug)).toBe(mode.id);
    }
    expect(modeFromSlug("not-a-mode")).toBeNull();
  });
});

describe("mods", () => {
  it("renders NM when no mods are set", () => {
    expect(modsToString(0)).toBe("NM");
    expect(decomposeMods(0)).toEqual([]);
  });

  it("renders mods in osu!'s bit order, not the order they were combined", () => {
    expect(modsToString(MODS.DOUBLETIME | MODS.HIDDEN)).toBe("HDDT");
    expect(modsToString(MODS.HIDDEN | MODS.DOUBLETIME)).toBe("HDDT");
    expect(modsToString(MODS.HARDROCK | MODS.HIDDEN | MODS.NIGHTCORE)).toBe("HDHRNC");
  });

  it("decodes the values the API actually returns", () => {
    // 88 = HD | HR | DT, a combination in the seeded data
    expect(modsToString(88)).toBe("HDHRDT");
    // 1024 = FL
    expect(modsToString(1024)).toBe("FL");
    // 8256 = DT | AP, which autopilot plays in the seeded data carry
    expect(modsToString(8256)).toBe("DTAP");
  });

  it("keeps key mods addressable for mania", () => {
    expect(modsToString(MODS.KEY5)).toBe("5K");
    expect(modsToString(MODS.MIRROR)).toBe("MR");
  });
});

describe("grades", () => {
  it("collapses silver and gold ranks to one glyph with different colours", () => {
    expect(gradeStyle("X").label).toBe("SS");
    expect(gradeStyle("XH").label).toBe("SS");
    expect(gradeStyle("X").background).not.toBe(gradeStyle("XH").background);
    expect(gradeStyle("S").label).toBe("S");
    expect(gradeStyle("SH").label).toBe("S");
  });

  it("handles failed plays and unknown values", () => {
    expect(gradeStyle("F").label).toBe("F");
    expect(gradeStyle("").label).toBe("–");
    expect(gradeStyle("banana").label).toBe("–");
  });

  it("labels submission statuses the way bancho.py numbers them", () => {
    expect(scoreStatusLabel(0)).toBe("Failed");
    expect(scoreStatusLabel(1)).toBe("Submitted");
    expect(scoreStatusLabel(2)).toBe("Personal best");
  });
});

describe("beatmap statuses", () => {
  it("names every status bancho.py can store", () => {
    expect(statusLabel(-1)).toBe("Unsubmitted");
    expect(statusLabel(0)).toBe("Unranked");
    expect(statusLabel(2)).toBe("Ranked");
    expect(statusLabel(4)).toBe("Qualified");
    expect(statusLabel(5)).toBe("Loved");
  });

  it("awards pp only for ranked and approved maps", () => {
    expect(isScoreable(2)).toBe(true);
    expect(isScoreable(3)).toBe(true);
    expect(isScoreable(4)).toBe(false); // qualified
    expect(isScoreable(5)).toBe(false); // loved
    expect(isScoreable(0)).toBe(false);
  });

  it("moves along the difficulty spectrum as stars rise", () => {
    expect(difficultyColor(0.5)).toMatch(/^rgb\(/);
    // the spectrum is monotonic in the sense that neighbours differ
    const samples = [1, 2, 3, 4, 5, 6, 7, 8].map(difficultyColor);
    expect(new Set(samples).size).toBe(samples.length);
    // anything past the last stop is black
    expect(difficultyColor(12)).toBe("rgb(0, 0, 0)");
  });

  it("names difficulty bands", () => {
    expect(difficultyTier(1.4)).toBe("Easy");
    expect(difficultyTier(2.4)).toBe("Normal");
    expect(difficultyTier(3.5)).toBe("Hard");
    expect(difficultyTier(4.8)).toBe("Insane");
    expect(difficultyTier(6.0)).toBe("Expert");
    expect(difficultyTier(8.3)).toBe("Expert+");
  });
});

describe("privileges", () => {
  it("treats a player without UNRESTRICTED as hidden", () => {
    expect(isRestricted(0)).toBe(true);
    expect(isRestricted(PRIVILEGES.VERIFIED)).toBe(true);
    expect(isRestricted(PRIVILEGES.UNRESTRICTED)).toBe(false);
  });

  it("recognises staff and donors", () => {
    expect(isStaff(PRIVILEGES.MODERATOR)).toBe(true);
    expect(isStaff(PRIVILEGES.DEVELOPER)).toBe(true);
    expect(isStaff(PRIVILEGES.NOMINATOR)).toBe(false);
    expect(isSupporter(PRIVILEGES.SUPPORTER)).toBe(true);
    expect(isSupporter(PRIVILEGES.PREMIUM)).toBe(true);
    expect(isSupporter(PRIVILEGES.UNRESTRICTED)).toBe(false);
  });

  it("shows only the highest staff role, plus donor status", () => {
    const badges = roleBadges(
      PRIVILEGES.UNRESTRICTED | PRIVILEGES.MODERATOR | PRIVILEGES.ADMINISTRATOR,
    );
    expect(badges.map((badge) => badge.label)).toEqual(["Administrator"]);

    const withDonor = roleBadges(PRIVILEGES.MODERATOR | PRIVILEGES.SUPPORTER);
    expect(withDonor.map((badge) => badge.label)).toEqual(["Moderator", "Supporter"]);

    // premium replaces supporter rather than stacking with it
    const premium = roleBadges(PRIVILEGES.SUPPORTER | PRIVILEGES.PREMIUM);
    expect(premium.map((badge) => badge.label)).toEqual(["Premium"]);
  });

  it("has no badges for an ordinary player", () => {
    expect(roleBadges(PRIVILEGES.UNRESTRICTED | PRIVILEGES.VERIFIED)).toEqual([]);
  });

  it("names clan ranks as bancho.py numbers them", () => {
    expect(clanRankLabel(1)).toBe("Member");
    expect(clanRankLabel(2)).toBe("Officer");
    expect(clanRankLabel(3)).toBe("Owner");
  });

  it("decodes play styles from their bitfield", () => {
    expect(playStyleLabels(0)).toEqual([]);
    expect(playStyleLabels(1 | 4)).toEqual(["Mouse", "Keyboard"]);
    expect(playStyleLabels(15)).toEqual(["Mouse", "Tablet", "Keyboard", "Touchscreen"]);
  });
});

describe("countries", () => {
  it("resolves codes to names, case-insensitively", () => {
    expect(countryName("us")).toBe("United States");
    expect(countryName("JP")).toBe("Japan");
    expect(countryName("xx")).toBe("Unknown");
    expect(countryName("zz")).toBe("Unknown");
  });

  it("offers every country except the placeholder for selection", () => {
    expect(COUNTRY_OPTIONS.some((option) => option.code === "xx")).toBe(false);
    expect(COUNTRY_OPTIONS.length).toBeGreaterThan(200);
    // sorted by name
    const names = COUNTRY_OPTIONS.map((option) => option.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
  });
});
