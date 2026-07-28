import { describe, expect, it } from "vitest";

import { MATCH_SLOT_IDS, MAX_MATCHES } from "@/lib/osu/matches";

describe("multiplayer match slots", () => {
  it("mirrors the size of bancho.py's match list", () => {
    expect(MAX_MATCHES).toBe(64);
    expect(MATCH_SLOT_IDS).toHaveLength(MAX_MATCHES);
  });

  it("is indexed from zero, like the list it addresses", () => {
    // A match's id *is* its index into that list, so slot 0 is a real match
    // that the server hands out first — skipping it hides a live lobby.
    expect(MATCH_SLOT_IDS[0]).toBe(0);
  });

  it("stops before the end of the list", () => {
    // Asking for id 64 walks off the end of a 64-element list; bancho.py
    // rejects it, and older builds answered with a 500.
    expect(MATCH_SLOT_IDS.at(-1)).toBe(63);
    expect(MATCH_SLOT_IDS).not.toContain(64);
  });
});
