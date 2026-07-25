/**
 * Game modes, mirroring bancho.py's `GameMode` (app/constants/gamemodes.py).
 *
 * Ids 0-3 are the vanilla rulesets; 4-6 are their relax variants and 8 is
 * autopilot osu!. Ids 7 and 9-11 exist in the enum but are rejected by the
 * API, so they are absent here.
 */

export const VALID_MODES = [0, 1, 2, 3, 4, 5, 6, 8] as const;

export type ModeId = (typeof VALID_MODES)[number];

export type Ruleset = "osu" | "taiko" | "catch" | "mania";
export type ModGroup = "vanilla" | "relax" | "autopilot";

export interface GameModeInfo {
  id: ModeId;
  /** Ruleset this mode plays under. */
  ruleset: Ruleset;
  group: ModGroup;
  /** Ruleset label, e.g. "osu!" or "osu!taiko". */
  name: string;
  /**
   * Compact label that stays unique across mod groups, e.g. "taiko" or
   * "osu! rx" — the plain ruleset name repeats across groups, so it cannot
   * label a flat list of modes on its own.
   */
  shortName: string;
  /** Full label including the mod group, e.g. "osu!taiko (Relax)". */
  fullName: string;
  /** URL fragment used in this app, e.g. "osu-relax". */
  slug: string;
}

const RULESET_NAMES: Record<Ruleset, string> = {
  osu: "osu!",
  taiko: "osu!taiko",
  catch: "osu!catch",
  mania: "osu!mania",
};

const RULESET_SHORT: Record<Ruleset, string> = {
  osu: "osu!",
  taiko: "taiko",
  catch: "catch",
  mania: "mania",
};

const GROUP_NAMES: Record<ModGroup, string> = {
  vanilla: "Vanilla",
  relax: "Relax",
  autopilot: "Autopilot",
};

/** Suffix distinguishing a relax or autopilot board from the vanilla one. */
const GROUP_TAGS: Record<ModGroup, string> = {
  vanilla: "",
  relax: "rx",
  autopilot: "ap",
};

function build(id: ModeId, ruleset: Ruleset, group: ModGroup): GameModeInfo {
  const name = RULESET_NAMES[ruleset];
  const tag = GROUP_TAGS[group];
  return {
    id,
    ruleset,
    group,
    name,
    shortName: tag ? `${RULESET_SHORT[ruleset]} ${tag}` : RULESET_SHORT[ruleset],
    fullName: group === "vanilla" ? name : `${name} (${GROUP_NAMES[group]})`,
    slug: group === "vanilla" ? ruleset : `${ruleset}-${group}`,
  };
}

export const GAME_MODES: Record<ModeId, GameModeInfo> = {
  0: build(0, "osu", "vanilla"),
  1: build(1, "taiko", "vanilla"),
  2: build(2, "catch", "vanilla"),
  3: build(3, "mania", "vanilla"),
  4: build(4, "osu", "relax"),
  5: build(5, "taiko", "relax"),
  6: build(6, "catch", "relax"),
  8: build(8, "osu", "autopilot"),
};

export const MODE_LIST: GameModeInfo[] = VALID_MODES.map((id) => GAME_MODES[id]);

/** Modes grouped for tabbed navigation. */
export const MODES_BY_GROUP: { group: ModGroup; label: string; modes: GameModeInfo[] }[] = [
  { group: "vanilla", label: "Vanilla", modes: MODE_LIST.filter((m) => m.group === "vanilla") },
  { group: "relax", label: "Relax", modes: MODE_LIST.filter((m) => m.group === "relax") },
  { group: "autopilot", label: "Autopilot", modes: MODE_LIST.filter((m) => m.group === "autopilot") },
];

export function isValidMode(mode: number): mode is ModeId {
  return (VALID_MODES as readonly number[]).includes(mode);
}

/** Coerce any input into a playable mode id, defaulting to vanilla osu!. */
export function toMode(value: string | number | null | undefined): ModeId {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof parsed === "number" && isValidMode(parsed) ? parsed : 0;
}

export function modeInfo(mode: number): GameModeInfo {
  return GAME_MODES[toMode(mode)];
}

/** Resolve a slug such as "taiko-relax" back to its mode id. */
export function modeFromSlug(slug: string): ModeId | null {
  const found = MODE_LIST.find((mode) => mode.slug === slug);
  return found ? found.id : null;
}

/** The underlying ruleset id (0-3), which decides scoring and mod validity. */
export function vanillaMode(mode: number): number {
  return toMode(mode) % 4;
}

/** Accent colour per ruleset, used to tint mode-specific UI. */
export const RULESET_COLORS: Record<Ruleset, string> = {
  osu: "#ff66ab",
  taiko: "#ff7b53",
  catch: "#5ed99a",
  mania: "#6f8dff",
};
