/**
 * Mod bitflags, mirroring bancho.py's `Mods` (app/constants/mods.py).
 */

export const MODS = {
  NOFAIL: 1 << 0,
  EASY: 1 << 1,
  TOUCHSCREEN: 1 << 2,
  HIDDEN: 1 << 3,
  HARDROCK: 1 << 4,
  SUDDENDEATH: 1 << 5,
  DOUBLETIME: 1 << 6,
  RELAX: 1 << 7,
  HALFTIME: 1 << 8,
  NIGHTCORE: 1 << 9,
  FLASHLIGHT: 1 << 10,
  AUTOPLAY: 1 << 11,
  SPUNOUT: 1 << 12,
  AUTOPILOT: 1 << 13,
  PERFECT: 1 << 14,
  KEY4: 1 << 15,
  KEY5: 1 << 16,
  KEY6: 1 << 17,
  KEY7: 1 << 18,
  KEY8: 1 << 19,
  FADEIN: 1 << 20,
  RANDOM: 1 << 21,
  CINEMA: 1 << 22,
  TARGET: 1 << 23,
  KEY9: 1 << 24,
  KEYCOOP: 1 << 25,
  KEY1: 1 << 26,
  KEY3: 1 << 27,
  KEY2: 1 << 28,
  SCOREV2: 1 << 29,
  MIRROR: 1 << 30,
} as const;

export type ModName = keyof typeof MODS;

/**
 * Mods in the order osu! displays them, with their two-letter acronyms.
 * bancho.py iterates its enum in bit order to build mod strings, so this
 * keeps the same sequence.
 */
const MOD_ACRONYMS: [ModName, string, string][] = [
  ["NOFAIL", "NF", "No Fail"],
  ["EASY", "EZ", "Easy"],
  ["TOUCHSCREEN", "TD", "Touch Device"],
  ["HIDDEN", "HD", "Hidden"],
  ["HARDROCK", "HR", "Hard Rock"],
  ["SUDDENDEATH", "SD", "Sudden Death"],
  ["DOUBLETIME", "DT", "Double Time"],
  ["RELAX", "RX", "Relax"],
  ["HALFTIME", "HT", "Half Time"],
  ["NIGHTCORE", "NC", "Nightcore"],
  ["FLASHLIGHT", "FL", "Flashlight"],
  ["AUTOPLAY", "AU", "Auto"],
  ["SPUNOUT", "SO", "Spun Out"],
  ["AUTOPILOT", "AP", "Autopilot"],
  ["PERFECT", "PF", "Perfect"],
  ["KEY4", "4K", "4 Keys"],
  ["KEY5", "5K", "5 Keys"],
  ["KEY6", "6K", "6 Keys"],
  ["KEY7", "7K", "7 Keys"],
  ["KEY8", "8K", "8 Keys"],
  ["FADEIN", "FI", "Fade In"],
  ["RANDOM", "RN", "Random"],
  ["CINEMA", "CN", "Cinema"],
  ["TARGET", "TP", "Target Practice"],
  ["KEY9", "9K", "9 Keys"],
  ["KEYCOOP", "CO", "Co-op"],
  ["KEY1", "1K", "1 Key"],
  ["KEY3", "3K", "3 Keys"],
  ["KEY2", "2K", "2 Keys"],
  ["SCOREV2", "V2", "Score V2"],
  ["MIRROR", "MR", "Mirror"],
];

export interface ModInfo {
  name: ModName;
  acronym: string;
  label: string;
  bit: number;
}

/** Decompose a mod bitfield into individual mods, in display order. */
export function decomposeMods(mods: number): ModInfo[] {
  if (!mods) return [];
  const result: ModInfo[] = [];
  for (const [name, acronym, label] of MOD_ACRONYMS) {
    const bit = MODS[name];
    if (mods & bit) result.push({ name, acronym, label, bit });
  }
  return result;
}

/** Render a mod bitfield the way osu! writes it, e.g. "HDDT" or "NM". */
export function modsToString(mods: number): string {
  const parts = decomposeMods(mods);
  return parts.length ? parts.map((mod) => mod.acronym).join("") : "NM";
}

/** Mods that change the rate of play, worth surfacing on score rows. */
export const SPEED_MODS = MODS.DOUBLETIME | MODS.NIGHTCORE | MODS.HALFTIME;

/** Mods selectable as a filter in the UI, per ruleset. */
export function selectableMods(vanillaMode: number): ModInfo[] {
  const common: ModName[] = [
    "NOFAIL",
    "EASY",
    "HIDDEN",
    "HARDROCK",
    "SUDDENDEATH",
    "DOUBLETIME",
    "NIGHTCORE",
    "HALFTIME",
    "FLASHLIGHT",
    "PERFECT",
  ];
  const perMode: Record<number, ModName[]> = {
    0: ["SPUNOUT", "TARGET"],
    1: [],
    2: [],
    3: ["FADEIN", "MIRROR", "RANDOM", "KEY4", "KEY5", "KEY6", "KEY7", "KEY8"],
  };
  const names = [...common, ...(perMode[vanillaMode] ?? [])];
  return MOD_ACRONYMS.filter(([name]) => names.includes(name)).map(([name, acronym, label]) => ({
    name,
    acronym,
    label,
    bit: MODS[name],
  }));
}
