/**
 * Player privileges, mirroring bancho.py's `Privileges`
 * (app/constants/privileges.py).
 */

export const PRIVILEGES = {
  UNRESTRICTED: 1 << 0,
  VERIFIED: 1 << 1,
  WHITELISTED: 1 << 2,
  SUPPORTER: 1 << 4,
  PREMIUM: 1 << 5,
  ALUMNI: 1 << 7,
  TOURNEY_MANAGER: 1 << 10,
  NOMINATOR: 1 << 11,
  MODERATOR: 1 << 12,
  ADMINISTRATOR: 1 << 13,
  DEVELOPER: 1 << 14,
} as const;

export interface RoleBadge {
  label: string;
  /** Badge text colour. */
  color: string;
  /** Badge background colour. */
  background: string;
  description: string;
}

/**
 * Roles worth showing on a profile, most significant first. Only the
 * highest-ranking staff role is displayed, alongside any donor status.
 */
const STAFF_ROLES: [number, RoleBadge][] = [
  [
    PRIVILEGES.DEVELOPER,
    {
      label: "Developer",
      color: "#ffd7ea",
      background: "rgba(255, 102, 171, 0.18)",
      description: "Manages the server",
    },
  ],
  [
    PRIVILEGES.ADMINISTRATOR,
    {
      label: "Administrator",
      color: "#ffcfcf",
      background: "rgba(255, 90, 90, 0.18)",
      description: "Manages players and server state",
    },
  ],
  [
    PRIVILEGES.MODERATOR,
    {
      label: "Moderator",
      color: "#c6ecff",
      background: "rgba(79, 163, 247, 0.18)",
      description: "Keeps the community in order",
    },
  ],
  [
    PRIVILEGES.NOMINATOR,
    {
      label: "Nominator",
      color: "#d9ffd0",
      background: "rgba(136, 218, 32, 0.18)",
      description: "Decides which maps get ranked",
    },
  ],
  [
    PRIVILEGES.TOURNEY_MANAGER,
    {
      label: "Tournament Staff",
      color: "#e6d7ff",
      background: "rgba(167, 139, 250, 0.18)",
      description: "Runs tournament matches",
    },
  ],
];

const DONOR_BADGE: RoleBadge = {
  label: "Supporter",
  color: "#ffd7ea",
  background: "rgba(255, 102, 171, 0.16)",
  description: "Supports the server",
};

const PREMIUM_BADGE: RoleBadge = {
  label: "Premium",
  color: "#ffe6a8",
  background: "rgba(255, 204, 34, 0.16)",
  description: "Supports the server at the premium tier",
};

const ALUMNI_BADGE: RoleBadge = {
  label: "Alumni",
  color: "#ffe0c2",
  background: "rgba(255, 123, 83, 0.16)",
  description: "Former member of the team",
};

/** Every badge a player should display, in order of prominence. */
export function roleBadges(priv: number): RoleBadge[] {
  const badges: RoleBadge[] = [];

  const staff = STAFF_ROLES.find(([bit]) => priv & bit);
  if (staff) badges.push(staff[1]);

  if (priv & PRIVILEGES.ALUMNI) badges.push(ALUMNI_BADGE);
  if (priv & PRIVILEGES.PREMIUM) badges.push(PREMIUM_BADGE);
  else if (priv & PRIVILEGES.SUPPORTER) badges.push(DONOR_BADGE);

  return badges;
}

export function isStaff(priv: number): boolean {
  return Boolean(
    priv & (PRIVILEGES.MODERATOR | PRIVILEGES.ADMINISTRATOR | PRIVILEGES.DEVELOPER),
  );
}

export function isSupporter(priv: number): boolean {
  return Boolean(priv & (PRIVILEGES.SUPPORTER | PRIVILEGES.PREMIUM));
}

/** A player who is banned or has never logged in is hidden from the site. */
export function isRestricted(priv: number): boolean {
  return !(priv & PRIVILEGES.UNRESTRICTED);
}

/** Clan ranks (`ClanPrivileges`): 1 member, 2 officer, 3 owner. */
export const CLAN_RANKS: Record<number, string> = {
  1: "Member",
  2: "Officer",
  3: "Owner",
};

export function clanRankLabel(clanPriv: number): string {
  return CLAN_RANKS[clanPriv] ?? "Member";
}

/**
 * In-game presence, from bancho.py's `Action` enum. Shown when a player is
 * connected to the game server.
 */
export const PLAYER_ACTIONS: Record<number, string> = {
  0: "Idle",
  1: "AFK",
  2: "Playing",
  3: "Editing",
  4: "Modding",
  5: "In a multiplayer lobby",
  6: "Watching a replay",
  7: "Unknown",
  8: "Testing",
  9: "Submitting a map",
  10: "Paused",
  11: "In a lobby",
  12: "In a multiplayer match",
  13: "Playing multiplayer",
  14: "Browsing osu!direct",
};

export function actionLabel(action: number): string {
  return PLAYER_ACTIONS[action] ?? "Online";
}

/**
 * Play styles are stored as a bitfield on `users.play_style`, matching the
 * options the osu! client offers.
 */
export const PLAY_STYLES: [number, string][] = [
  [1 << 0, "Mouse"],
  [1 << 1, "Tablet"],
  [1 << 2, "Keyboard"],
  [1 << 3, "Touchscreen"],
];

export function playStyleLabels(playStyle: number): string[] {
  return PLAY_STYLES.filter(([bit]) => playStyle & bit).map(([, label]) => label);
}
