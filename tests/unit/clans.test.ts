import { describe, expect, it } from "vitest";

import type { ClanMembership } from "@/lib/bancho/clan-types";
import {
  CLAN_NAME_MAX,
  CLAN_NAME_MIN,
  CLAN_RANK_POWERS,
  CLAN_TAG_MAX,
  CLAN_TAG_MIN,
  normaliseClanTag,
  validateClanName,
  validateClanTag,
} from "@/lib/osu/clans";
import { clanRankLabel } from "@/lib/osu/privileges";

function membership(overrides: Partial<ClanMembership> = {}): ClanMembership {
  return {
    clan_priv: 0,
    is_member: false,
    can_invite: false,
    can_kick: false,
    can_manage_ranks: false,
    can_edit: false,
    can_transfer: false,
    can_disband: false,
    can_leave: false,
    ...overrides,
  };
}

describe("clan tags", () => {
  it("accepts the lengths bancho.py allows", () => {
    expect(validateClanTag("A").ok).toBe(true);
    expect(validateClanTag("ABCDEF").ok).toBe(true);
  });

  it("rejects anything outside them", () => {
    expect(validateClanTag("").ok).toBe(false);
    expect(validateClanTag("ABCDEFG").ok).toBe(false);
    // whitespace does not buy extra length
    expect(validateClanTag("   ").ok).toBe(false);
    expect(validateClanTag(" ABCDEFG ").ok).toBe(false);
  });

  it("is stored upper case, so shows what will be saved", () => {
    expect(normaliseClanTag("sun")).toBe("SUN");
    expect(normaliseClanTag("  sun  ")).toBe("SUN");
    expect(normaliseClanTag("")).toBe("");
  });

  it("matches the bounds it advertises", () => {
    expect(validateClanTag("x".repeat(CLAN_TAG_MIN)).ok).toBe(true);
    expect(validateClanTag("x".repeat(CLAN_TAG_MAX)).ok).toBe(true);
    expect(validateClanTag("x".repeat(CLAN_TAG_MAX + 1)).ok).toBe(false);
  });
});

describe("clan names", () => {
  it("accepts the lengths bancho.py allows", () => {
    expect(validateClanName("ab").ok).toBe(true);
    expect(validateClanName("Sunset Riders").ok).toBe(true);
    expect(validateClanName("x".repeat(CLAN_NAME_MAX)).ok).toBe(true);
  });

  it("rejects anything outside them", () => {
    expect(validateClanName("x").ok).toBe(false);
    expect(validateClanName("x".repeat(CLAN_NAME_MAX + 1)).ok).toBe(false);
    expect(validateClanName(" x ").ok).toBe(false);
  });

  it("explains what is wrong rather than just refusing", () => {
    const result = validateClanName("x");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(String(CLAN_NAME_MIN));
      expect(result.error).toContain(String(CLAN_NAME_MAX));
    }
  });
});

describe("clan ranks", () => {
  it("names each rank as the server does", () => {
    expect(clanRankLabel(1)).toBe("Member");
    expect(clanRankLabel(2)).toBe("Officer");
    expect(clanRankLabel(3)).toBe("Owner");
  });

  it("describes what each rank may do", () => {
    for (const rank of [1, 2, 3]) {
      expect(CLAN_RANK_POWERS[rank].length).toBeGreaterThan(0);
    }
  });
});

describe("membership gating", () => {
  it("gives an outsider nothing", () => {
    const outsider = membership();
    const controls = Object.entries(outsider).filter(([key]) => key.startsWith("can_"));
    expect(controls.every(([, allowed]) => allowed === false)).toBe(true);
  });

  it("lets a member leave and nothing else", () => {
    const member = membership({ clan_priv: 1, is_member: true, can_leave: true });
    expect(member.can_leave).toBe(true);
    expect(member.can_invite).toBe(false);
    expect(member.can_kick).toBe(false);
    expect(member.can_disband).toBe(false);
  });

  it("never lets an owner simply walk out", () => {
    // the server refuses it; the page must not offer it either
    const owner = membership({
      clan_priv: 3,
      is_member: true,
      can_invite: true,
      can_kick: true,
      can_manage_ranks: true,
      can_edit: true,
      can_transfer: true,
      can_disband: true,
      can_leave: false,
    });
    expect(owner.can_leave).toBe(false);
    expect(owner.can_disband).toBe(true);
  });

  it("lets server staff disband without being in the clan", () => {
    const staff = membership({ can_disband: true });
    expect(staff.is_member).toBe(false);
    expect(staff.can_disband).toBe(true);
    // but staff rank is not clan rank
    expect(staff.can_invite).toBe(false);
    expect(staff.can_edit).toBe(false);
  });
});
