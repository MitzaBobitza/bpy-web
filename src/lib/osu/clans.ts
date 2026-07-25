/**
 * Clan rules, mirrored from bancho.py so the forms can refuse bad input
 * before a request is made. The server checks all of this again.
 */

export const CLAN_TAG_MIN = 1;
export const CLAN_TAG_MAX = 6;
export const CLAN_NAME_MIN = 2;
export const CLAN_NAME_MAX = 16;

/** What each clan rank may do, for the page to explain itself. */
export const CLAN_RANK_POWERS: Record<number, string> = {
  1: "Can leave the clan",
  2: "Can invite and remove members",
  3: "Can rename, promote, transfer and disband",
};

export type ClanValidation = { ok: true } | { ok: false; error: string };

export function validateClanTag(tag: string): ClanValidation {
  const trimmed = tag.trim();
  if (trimmed.length < CLAN_TAG_MIN || trimmed.length > CLAN_TAG_MAX) {
    return {
      ok: false,
      error: `Tag must be ${CLAN_TAG_MIN}–${CLAN_TAG_MAX} characters.`,
    };
  }
  return { ok: true };
}

export function validateClanName(name: string): ClanValidation {
  const trimmed = name.trim();
  if (trimmed.length < CLAN_NAME_MIN || trimmed.length > CLAN_NAME_MAX) {
    return {
      ok: false,
      error: `Name must be ${CLAN_NAME_MIN}–${CLAN_NAME_MAX} characters.`,
    };
  }
  return { ok: true };
}

/** Tags are stored upper case, so show what will actually be saved. */
export function normaliseClanTag(tag: string): string {
  return tag.trim().toUpperCase();
}
