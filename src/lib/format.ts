/**
 * Number, date and duration formatting shared across the site.
 *
 * Everything is rendered with a fixed locale so the server and the browser
 * agree — a mismatch would show up as a hydration error.
 */

const LOCALE = "en-US";

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return integer.format(value);
}

/** Performance points, always shown without decimals as osu! does. */
export function formatPp(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return integer.format(Math.round(value));
}

export function formatAccuracy(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return `${value.toFixed(digits)}%`;
}

/** Star rating, e.g. "6.94★". */
export function formatStars(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return value.toFixed(2);
}

/** Compact form for large counts, e.g. 12_400 → "12.4k". */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatRank(rank: number | null | undefined): string {
  if (rank === null || rank === undefined || rank <= 0) return "–";
  return `#${integer.format(rank)}`;
}

/** Seconds → "1:23" or "1:02:03" for anything over an hour. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return "–";
  }
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/** Seconds → "412h 18m", the way osu! reports total play time. */
export function formatPlaytime(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return "0h";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours >= 1000) return `${integer.format(hours)}h`;
  if (hours === 0) return `${minutes}m`;
  return `${integer.format(hours)}h ${minutes}m`;
}

/** Matches a trailing timezone designator: "Z", "+02:00" or "-0200". */
const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/;

/** Unix seconds or an ISO string → a Date. bancho.py mixes both. */
export function toDate(value: number | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (value <= 0) return null;
    return new Date(value * 1000);
  }

  const text = value.trim();
  if (!text) return null;

  // bancho.py serialises naive datetimes in UTC, and JavaScript would
  // otherwise read them as local time — which shifts every timestamp by the
  // host's offset. A date with no time part is already treated as UTC.
  const hasTime = text.includes("T") || text.includes(" ");
  const hasTimezone = TIMEZONE_SUFFIX.test(text);
  const normalised = hasTime && !hasTimezone ? `${text.replace(" ", "T")}Z` : text;

  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function formatDate(value: number | string | null | undefined): string {
  const date = toDate(value);
  return date ? dateFormatter.format(date) : "–";
}

export function formatDateTime(value: number | string | null | undefined): string {
  const date = toDate(value);
  return date ? `${dateTimeFormatter.format(date)} UTC` : "–";
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3600],
  ["minute", 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/**
 * "3 days ago". Pass `now` explicitly when rendering on the server so the
 * markup does not depend on when the request happened to be handled.
 */
export function formatRelative(
  value: number | string | null | undefined,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return "never";
  const seconds = (date.getTime() - now) / 1000;
  const magnitude = Math.abs(seconds);
  if (magnitude < 45) return "just now";
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (magnitude >= unitSeconds) {
      return relativeFormatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return relativeFormatter.format(Math.round(seconds), "second");
}

/** Hit counts in the order osu! lists them for a ruleset. */
export function hitBreakdown(
  score: { n300: number; n100: number; n50: number; nmiss: number; ngeki: number; nkatu: number },
  vanillaMode: number,
): { label: string; value: number; color: string }[] {
  const great = { label: "300", value: score.n300, color: "#66ccff" };
  const ok = { label: "100", value: score.n100, color: "#88da20" };
  const meh = { label: "50", value: score.n50, color: "#ffcc22" };
  const miss = { label: "Miss", value: score.nmiss, color: "#ff5a5a" };

  switch (vanillaMode) {
    case 1: // taiko: great / good / miss
      return [
        { label: "Great", value: score.n300, color: "#66ccff" },
        { label: "Good", value: score.n100, color: "#88da20" },
        miss,
      ];
    case 2: // catch: fruits / drops / droplets / miss
      return [
        { label: "Fruit", value: score.n300, color: "#66ccff" },
        { label: "Drop", value: score.n100, color: "#88da20" },
        { label: "Droplet", value: score.n50, color: "#ffcc22" },
        miss,
      ];
    case 3: // mania: rainbow 300 / 300 / 200 / 100 / 50 / miss
      return [
        { label: "Rainbow", value: score.ngeki, color: "#c8f0ff" },
        { label: "300", value: score.n300, color: "#66ccff" },
        { label: "200", value: score.nkatu, color: "#88da20" },
        ok,
        meh,
        miss,
      ];
    default:
      return [great, ok, meh, miss];
  }
}

/**
 * Whether a unix timestamp is still in the future — used for supporter
 * periods, which bancho.py stores as `users.donor_end`.
 *
 * The clock read lives here rather than in a component so rendering stays
 * free of impure calls.
 */
export function isStillActive(unixSeconds: number | null | undefined): boolean {
  if (!unixSeconds || unixSeconds <= 0) return false;
  return unixSeconds * 1000 > Date.now();
}
