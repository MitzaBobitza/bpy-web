import type { AdminCapabilities, Capability } from "@/lib/bancho/admin-types";

/**
 * Vocabulary and helpers shared by the admin panel.
 *
 * The privilege names and standard reasons match bancho.py's own, so an
 * action taken here reads identically in the audit log to the same action
 * taken with a chat command.
 */

/** The roles `!addpriv` / `!rmpriv` and the admin API accept. */
export const ASSIGNABLE_ROLES: { name: string; label: string; description: string }[] = [
  { name: "normal", label: "Unrestricted", description: "A normal, unbanned player" },
  { name: "verified", label: "Verified", description: "Has logged in to the game at least once" },
  {
    name: "whitelisted",
    label: "Whitelisted",
    description: "Trusted: bypasses low-ceiling anticheat checks",
  },
  { name: "alumni", label: "Alumni", description: "A former member of the team" },
  {
    name: "tournament",
    label: "Tournament staff",
    description: "Can manage match state without being host, and build mappools",
  },
  { name: "nominator", label: "Nominator", description: "Can change beatmap ranked status" },
  { name: "mod", label: "Moderator", description: "Can silence players and add notes" },
  { name: "admin", label: "Administrator", description: "Can restrict players and announce" },
  {
    name: "developer",
    label: "Developer",
    description: "Full control, including privileges and staff management",
  },
];

/**
 * Donor roles are deliberately absent above: bancho.py rejects them on the
 * privilege endpoints because granting them without an expiry would leave
 * supporter status that never lapses. The donator grant sets both.
 */
export const DONOR_ROLES = ["supporter", "premium"];

export function roleLabel(name: string): string {
  return ASSIGNABLE_ROLES.find((role) => role.name === name)?.label ?? name;
}

/**
 * The reasons bancho.py abbreviates in chat, spelled out. Offering these as
 * presets keeps audit entries consistent between the panel and `!restrict`.
 */
export const STANDARD_REASONS: { short: string; reason: string }[] = [
  { short: "cc", reason: "using a modified osu! client" },
  { short: "3p", reason: "using 3rd party programs" },
  { short: "rx", reason: "using 3rd party programs (relax)" },
  { short: "tw", reason: "using 3rd party programs (timewarp)" },
  { short: "au", reason: "using 3rd party programs (auto play)" },
  { short: "aa", reason: "having their appeal accepted" },
];

/**
 * Durations offered as one-click presets. `input` is what the field is
 * filled with, spelled the way `parseDuration` reads it — note that "m"
 * means minutes, so longer periods are expressed in days.
 */
export interface DurationPreset {
  label: string;
  input: string;
  seconds: number;
}

export const DURATION_PRESETS: DurationPreset[] = [
  { label: "1 hour", input: "1h", seconds: 3600 },
  { label: "6 hours", input: "6h", seconds: 6 * 3600 },
  { label: "1 day", input: "1d", seconds: 86400 },
  { label: "3 days", input: "3d", seconds: 3 * 86400 },
  { label: "1 week", input: "1w", seconds: 7 * 86400 },
  { label: "30 days", input: "30d", seconds: 30 * 86400 },
];

export const DONOR_PRESETS: DurationPreset[] = [
  { label: "30 days", input: "30d", seconds: 30 * 86400 },
  { label: "90 days", input: "90d", seconds: 90 * 86400 },
  { label: "180 days", input: "180d", seconds: 180 * 86400 },
  { label: "1 year", input: "365d", seconds: 365 * 86400 },
];

const DURATION_UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

/**
 * Parse a duration the way staff write it in chat — "30m", "2h", "7d",
 * or several parts together like "1d12h". Returns null if unparseable.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  // a bare number is read as minutes, which is the common intent
  if (/^\d+$/.test(text)) {
    const minutes = Number.parseInt(text, 10);
    return minutes > 0 ? minutes * 60 : null;
  }

  const parts = text.match(/\d+\s*[smhdw]/g);
  if (!parts) return null;
  // reject trailing junk such as "2h!!"
  if (parts.join("").replace(/\s+/g, "") !== text.replace(/\s+/g, "")) return null;

  let total = 0;
  for (const part of parts) {
    const value = Number.parseInt(part, 10);
    const unit = part.trim().slice(-1);
    total += value * DURATION_UNITS[unit];
  }
  return total > 0 ? total : null;
}

/** Seconds → "2 days, 4 hours", for confirming what is about to happen. */
export function describeDuration(seconds: number): string {
  if (seconds <= 0) return "no time";

  const units: [string, number][] = [
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];

  const parts: string[] = [];
  let remaining = Math.floor(seconds);
  for (const [name, size] of units) {
    const count = Math.floor(remaining / size);
    if (count > 0) {
      parts.push(`${count} ${name}${count === 1 ? "" : "s"}`);
      remaining -= count * size;
    }
    if (parts.length === 2) break;
  }
  return parts.join(", ");
}

/** How each audit log action is described, and how it should read. */
export const AUDIT_ACTIONS: Record<string, { label: string; tone: "neutral" | "warn" | "bad" | "good" }> = {
  note: { label: "Note added", tone: "neutral" },
  silence: { label: "Silenced", tone: "warn" },
  unsilence: { label: "Unsilenced", tone: "good" },
  restrict: { label: "Restricted", tone: "bad" },
  unrestrict: { label: "Unrestricted", tone: "good" },
  priv_grant: { label: "Privileges granted", tone: "neutral" },
  priv_revoke: { label: "Privileges revoked", tone: "warn" },
  donor_grant: { label: "Donator granted", tone: "good" },
};

export function auditAction(action: string): {
  label: string;
  tone: "neutral" | "warn" | "bad" | "good";
} {
  return AUDIT_ACTIONS[action] ?? { label: action, tone: "neutral" };
}

/** The admin sections, and the capability each one needs. */
export const ADMIN_SECTIONS: {
  href: string;
  label: string;
  description: string;
  capability: Capability;
}[] = [
  {
    href: "/admin/players",
    label: "Players",
    description: "Look up accounts, moderate and manage privileges",
    capability: "add_notes",
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    description: "Every moderation action taken on the server",
    capability: "view_audit_log",
  },
  {
    href: "/admin/beatmaps",
    label: "Beatmaps",
    description: "Nomination queue and ranked status",
    capability: "manage_map_status",
  },
  {
    href: "/admin/mappools",
    label: "Mappools",
    description: "Build tournament pools",
    capability: "manage_mappools",
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    description: "Notify everyone, or one player",
    capability: "send_announcements",
  },
  {
    href: "/admin/maintenance",
    label: "Maintenance",
    description: "Score wipes and other developer tools",
    capability: "wipe_map_scores",
  },
];

/** The sections a staff member may open. */
export function allowedSections(
  capabilities: AdminCapabilities,
): typeof ADMIN_SECTIONS {
  return ADMIN_SECTIONS.filter((section) => capabilities[section.capability]);
}
