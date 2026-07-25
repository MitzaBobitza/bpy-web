/**
 * Beatmap ranked statuses and the star-rating colour spectrum.
 */

/** `RankedStatus` in bancho.py (app/constants/beatmap_statuses.py). */
export const RANKED_STATUS: Record<number, string> = {
  [-1]: "Unsubmitted",
  0: "Unranked",
  1: "Outdated",
  2: "Ranked",
  3: "Approved",
  4: "Qualified",
  5: "Loved",
};

/** Colour per status, following osu!'s own status badges. */
export const STATUS_COLORS: Record<number, string> = {
  [-1]: "#6b5b64",
  0: "#8a7580",
  1: "#8a7580",
  2: "#4fa3f7",
  3: "#5ed99a",
  4: "#a78bfa",
  5: "#ff66ab",
};

export function statusLabel(status: number): string {
  return RANKED_STATUS[status] ?? "Unknown";
}

export function statusColor(status: number): string {
  return STATUS_COLORS[status] ?? "#8a7580";
}

/** Statuses whose scores award pp. */
export function isScoreable(status: number): boolean {
  return status === 2 || status === 3;
}

/**
 * osu!'s difficulty spectrum: colour stops keyed by star rating, blended
 * between neighbours. Anything at or above 9 stars is rendered black, as
 * osu! does for "expert+" maps.
 */
const DIFFICULTY_STOPS: [number, [number, number, number]][] = [
  [0.1, [66, 144, 251]],
  [1.25, [79, 192, 255]],
  [2.0, [79, 255, 213]],
  [2.5, [124, 255, 79]],
  [3.3, [246, 240, 92]],
  [4.2, [255, 128, 104]],
  [4.9, [255, 78, 111]],
  [5.8, [198, 69, 184]],
  [6.7, [101, 99, 222]],
  [7.7, [24, 21, 142]],
  [9.0, [0, 0, 0]],
];

function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  const channel = (index: number) => Math.round(a[index] + (b[index] - a[index]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/** Colour for a star rating, matching osu!'s difficulty gradient. */
export function difficultyColor(stars: number): string {
  if (!Number.isFinite(stars) || stars <= DIFFICULTY_STOPS[0][0]) {
    const [, rgb] = DIFFICULTY_STOPS[0];
    return `rgb(${rgb.join(", ")})`;
  }
  for (let index = 0; index < DIFFICULTY_STOPS.length - 1; index += 1) {
    const [lowStars, lowRgb] = DIFFICULTY_STOPS[index];
    const [highStars, highRgb] = DIFFICULTY_STOPS[index + 1];
    if (stars <= highStars) {
      return mix(lowRgb, highRgb, (stars - lowStars) / (highStars - lowStars));
    }
  }
  return "rgb(0, 0, 0)";
}

/**
 * Whether a difficulty colour is dark enough to need light text on top.
 * The spectrum runs into near-black past 7 stars.
 */
export function difficultyNeedsLightText(stars: number): boolean {
  return stars >= 6.4;
}

/** osu!'s own name for a difficulty band, used as a secondary label. */
export function difficultyTier(stars: number): string {
  if (stars < 2) return "Easy";
  if (stars < 2.7) return "Normal";
  if (stars < 4) return "Hard";
  if (stars < 5.3) return "Insane";
  if (stars < 6.5) return "Expert";
  return "Expert+";
}
