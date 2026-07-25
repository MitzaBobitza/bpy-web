import { describe, expect, it } from "vitest";

import type { AdminCapabilities } from "@/lib/bancho/admin-types";
import {
  ADMIN_SECTIONS,
  allowedSections,
  ASSIGNABLE_ROLES,
  auditAction,
  describeDuration,
  DONOR_PRESETS,
  DONOR_ROLES,
  DURATION_PRESETS,
  parseDuration,
  roleLabel,
  STANDARD_REASONS,
} from "@/lib/osu/admin";
import { hasStaffAccess, PRIVILEGES, privilegeLabels } from "@/lib/osu/privileges";

function capabilities(overrides: Partial<AdminCapabilities> = {}): AdminCapabilities {
  return {
    is_staff: false,
    view_audit_log: false,
    add_notes: false,
    silence_players: false,
    restrict_players: false,
    send_announcements: false,
    view_player_investigation: false,
    manage_map_status: false,
    view_nomination_queue: false,
    manage_mappools: false,
    manage_clans: false,
    manage_privileges: false,
    grant_donor: false,
    wipe_map_scores: false,
    manage_staff: false,
    ...overrides,
  };
}

describe("duration parsing", () => {
  it("reads the shorthand staff use in chat", () => {
    expect(parseDuration("30m")).toBe(1800);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration("7d")).toBe(604800);
    expect(parseDuration("1w")).toBe(604800);
    expect(parseDuration("45s")).toBe(45);
  });

  it("adds several parts together", () => {
    expect(parseDuration("1d12h")).toBe(86400 + 12 * 3600);
    expect(parseDuration("1w 2d")).toBe(604800 + 2 * 86400);
  });

  it("treats a bare number as minutes", () => {
    expect(parseDuration("90")).toBe(5400);
  });

  it("is case-insensitive and tolerates spacing", () => {
    expect(parseDuration(" 2H ")).toBe(7200);
    expect(parseDuration("3 D")).toBe(3 * 86400);
  });

  it("rejects anything it cannot read", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("soon")).toBeNull();
    expect(parseDuration("2h!!")).toBeNull();
    expect(parseDuration("-2h")).toBeNull();
    expect(parseDuration("0")).toBeNull();
    expect(parseDuration("0m")).toBeNull();
    // months and years are not units here, so they must not silently parse
    expect(parseDuration("1mo")).toBeNull();
    expect(parseDuration("1y")).toBeNull();
  });

  it("every preset parses back to the seconds it claims", () => {
    for (const preset of [...DURATION_PRESETS, ...DONOR_PRESETS]) {
      expect(parseDuration(preset.input), preset.label).toBe(preset.seconds);
    }
  });
});

describe("duration descriptions", () => {
  it("reads naturally", () => {
    expect(describeDuration(3600)).toBe("1 hour");
    expect(describeDuration(7200)).toBe("2 hours");
    expect(describeDuration(86400)).toBe("1 day");
    expect(describeDuration(90000)).toBe("1 day, 1 hour");
    expect(describeDuration(604800)).toBe("1 week");
  });

  it("stops at two units so it stays readable", () => {
    expect(describeDuration(694861).split(", ")).toHaveLength(2);
  });

  it("handles nothing", () => {
    expect(describeDuration(0)).toBe("no time");
    expect(describeDuration(-5)).toBe("no time");
  });
});

describe("assignable roles", () => {
  it("excludes the donor roles, which the API rejects", () => {
    const names = ASSIGNABLE_ROLES.map((role) => role.name);
    for (const donor of DONOR_ROLES) {
      expect(names).not.toContain(donor);
    }
  });

  it("covers every privilege bancho.py names, minus donor", () => {
    // the vocabulary in app/constants/privileges.py
    const backendRoles = [
      "normal",
      "verified",
      "whitelisted",
      "supporter",
      "premium",
      "alumni",
      "tournament",
      "nominator",
      "mod",
      "admin",
      "developer",
    ];
    const expected = backendRoles.filter((role) => !DONOR_ROLES.includes(role));
    expect(ASSIGNABLE_ROLES.map((role) => role.name).sort()).toEqual(expected.sort());
  });

  it("gives every role a label and a description", () => {
    for (const role of ASSIGNABLE_ROLES) {
      expect(role.label.length).toBeGreaterThan(0);
      expect(role.description.length).toBeGreaterThan(0);
    }
    expect(roleLabel("mod")).toBe("Moderator");
    expect(roleLabel("unknown")).toBe("unknown");
  });
});

describe("standard reasons", () => {
  it("matches the wording bancho.py expands its shorthands to", () => {
    const byShort = Object.fromEntries(
      STANDARD_REASONS.map((entry) => [entry.short, entry.reason]),
    );
    // SHORTHAND_REASONS in app/commands.py
    expect(byShort.cc).toBe("using a modified osu! client");
    expect(byShort["3p"]).toBe("using 3rd party programs");
    expect(byShort.rx).toBe("using 3rd party programs (relax)");
    expect(byShort.tw).toBe("using 3rd party programs (timewarp)");
    expect(byShort.au).toBe("using 3rd party programs (auto play)");
    expect(byShort.aa).toBe("having their appeal accepted");
  });
});

describe("audit actions", () => {
  it("names every action the server writes", () => {
    for (const action of [
      "note",
      "silence",
      "unsilence",
      "restrict",
      "unrestrict",
      "priv_grant",
      "priv_revoke",
      "donor_grant",
    ]) {
      expect(auditAction(action).label).not.toBe(action);
    }
  });

  it("falls back to the raw name for anything unrecognised", () => {
    expect(auditAction("future_action").label).toBe("future_action");
    expect(auditAction("future_action").tone).toBe("neutral");
  });

  it("tones lifting an action differently from applying it", () => {
    expect(auditAction("restrict").tone).toBe("bad");
    expect(auditAction("unrestrict").tone).toBe("good");
    expect(auditAction("silence").tone).toBe("warn");
    expect(auditAction("unsilence").tone).toBe("good");
  });
});

describe("section gating", () => {
  it("shows nothing to a player with no capabilities", () => {
    expect(allowedSections(capabilities())).toEqual([]);
  });

  it("shows a moderator only what a moderator may do", () => {
    const sections = allowedSections(
      capabilities({ add_notes: true, view_audit_log: true }),
    ).map((section) => section.label);
    expect(sections).toEqual(["Players", "Audit log"]);
  });

  it("shows a nominator only the beatmap section", () => {
    const sections = allowedSections(capabilities({ manage_map_status: true })).map(
      (section) => section.label,
    );
    expect(sections).toEqual(["Beatmaps"]);
  });

  it("shows everything to a full administrator-developer", () => {
    const everything = Object.fromEntries(
      Object.keys(capabilities()).map((key) => [key, true]),
    ) as unknown as AdminCapabilities;
    expect(allowedSections(everything)).toHaveLength(ADMIN_SECTIONS.length);
  });
});

describe("staff access", () => {
  it("counts nominators and tournament managers as staff", () => {
    // they are not moderators, but each has a section of the panel
    expect(hasStaffAccess(PRIVILEGES.NOMINATOR)).toBe(true);
    expect(hasStaffAccess(PRIVILEGES.TOURNEY_MANAGER)).toBe(true);
    expect(hasStaffAccess(PRIVILEGES.MODERATOR)).toBe(true);
    expect(hasStaffAccess(PRIVILEGES.ADMINISTRATOR)).toBe(true);
    expect(hasStaffAccess(PRIVILEGES.DEVELOPER)).toBe(true);
  });

  it("excludes ordinary players and donors", () => {
    expect(hasStaffAccess(PRIVILEGES.UNRESTRICTED | PRIVILEGES.VERIFIED)).toBe(false);
    expect(hasStaffAccess(PRIVILEGES.SUPPORTER | PRIVILEGES.PREMIUM)).toBe(false);
    expect(hasStaffAccess(PRIVILEGES.WHITELISTED)).toBe(false);
    expect(hasStaffAccess(0)).toBe(false);
  });
});

describe("privilege labels", () => {
  it("lists each bit held, in escalating order", () => {
    const priv =
      PRIVILEGES.UNRESTRICTED | PRIVILEGES.VERIFIED | PRIVILEGES.DEVELOPER;
    expect(privilegeLabels(priv)).toEqual(["Unrestricted", "Verified", "Developer"]);
  });

  it("is empty for an account with nothing", () => {
    expect(privilegeLabels(0)).toEqual([]);
  });
});

describe("clan administration", () => {
  it("is offered to every staff privilege, as !clan disband is", () => {
    const sections = allowedSections(capabilities({ manage_clans: true })).map(
      (section) => section.label,
    );
    expect(sections).toEqual(["Clans"]);
  });

  it("is not offered to a nominator or tournament manager", () => {
    // neither holds a STAFF bit, so neither may act on a clan
    expect(
      allowedSections(capabilities({ manage_map_status: true })).map((s) => s.label),
    ).not.toContain("Clans");
    expect(
      allowedSections(capabilities({ manage_mappools: true })).map((s) => s.label),
    ).not.toContain("Clans");
  });

  it("names the actions a staff clan change writes to the audit log", () => {
    for (const action of [
      "clan_disband",
      "clan_rename",
      "clan_transfer",
      "clan_kick",
    ]) {
      expect(auditAction(action).label).not.toBe(action);
    }
  });

  it("tones dissolving a clan more severely than renaming one", () => {
    expect(auditAction("clan_disband").tone).toBe("bad");
    expect(auditAction("clan_rename").tone).toBe("warn");
    expect(auditAction("clan_transfer").tone).toBe("neutral");
  });
});
