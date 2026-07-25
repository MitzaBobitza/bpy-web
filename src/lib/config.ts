/**
 * Runtime configuration, read from the environment.
 *
 * Values prefixed `NEXT_PUBLIC_` are inlined into the browser bundle; the
 * rest are server-only (the upstream address in particular must never
 * reach the client).
 */

function pub(name: string, fallback: string): string {
  // NEXT_PUBLIC_* vars are replaced at build time, so they have to be
  // referenced as static property accesses rather than by a computed key.
  const values: Record<string, string | undefined> = {
    NEXT_PUBLIC_SERVER_NAME: process.env.NEXT_PUBLIC_SERVER_NAME,
    NEXT_PUBLIC_DOMAIN: process.env.NEXT_PUBLIC_DOMAIN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_AVATAR_URL: process.env.NEXT_PUBLIC_AVATAR_URL,
    NEXT_PUBLIC_BEATMAP_MIRROR_URL: process.env.NEXT_PUBLIC_BEATMAP_MIRROR_URL,
    NEXT_PUBLIC_DISCORD_INVITE: process.env.NEXT_PUBLIC_DISCORD_INVITE,
    NEXT_PUBLIC_CAPTCHA_PROVIDER: process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER,
    NEXT_PUBLIC_CAPTCHA_SITEKEY: process.env.NEXT_PUBLIC_CAPTCHA_SITEKEY,
  };
  const value = values[name];
  return value && value.length > 0 ? value : fallback;
}

const domain = pub("NEXT_PUBLIC_DOMAIN", "bpy.test");

export const config = {
  /** Display name of the server, used in titles and the header. */
  serverName: pub("NEXT_PUBLIC_SERVER_NAME", "Sunrise"),
  /** Root domain bancho.py is configured with (its `DOMAIN` setting). */
  domain,
  /**
   * Where this website is reachable, absolute and without a trailing slash.
   *
   * Link previews need absolute urls: a chat app resolving a share image
   * has no page to resolve a relative one against.
   */
  siteUrl: pub("NEXT_PUBLIC_SITE_URL", `https://${domain}`).replace(/\/+$/, ""),
  /** Where player avatars are served from (nginx serves `a.{domain}`). */
  avatarUrl: pub("NEXT_PUBLIC_AVATAR_URL", `https://a.${domain}`),
  /** Beatmap mirror used for `.osz` downloads. */
  beatmapMirrorUrl: pub("NEXT_PUBLIC_BEATMAP_MIRROR_URL", "https://catboy.best/d"),
  discordInvite: pub("NEXT_PUBLIC_DISCORD_INVITE", ""),
  captcha: {
    /** One of `recaptcha`, `hcaptcha`, `turnstile`, or empty to disable. */
    provider: pub("NEXT_PUBLIC_CAPTCHA_PROVIDER", "") as CaptchaProvider,
    siteKey: pub("NEXT_PUBLIC_CAPTCHA_SITEKEY", ""),
  },
} as const;

export type CaptchaProvider = "" | "recaptcha" | "hcaptcha" | "turnstile";

/** Server-only: the bancho.py upstream and the Host header it routes on. */
export const serverConfig = {
  /** Address bancho.py listens on, e.g. `http://127.0.0.1:10000`. */
  upstreamUrl: process.env.BANCHO_API_URL ?? "http://127.0.0.1:10000",
  /**
   * bancho.py routes by Host header; its developer API is only reachable
   * as `api.{DOMAIN}`, so every proxied request must carry that host.
   */
  upstreamHost: process.env.BANCHO_API_HOST ?? `api.${domain}`,
} as const;

/** Cover image for a beatmap set, served by osu!'s asset CDN. */
export function beatmapCoverUrl(setId: number, size: "card" | "cover" | "list" = "cover"): string {
  const suffix = { card: "card", cover: "cover", list: "list@2x" }[size];
  return `https://assets.ppy.sh/beatmaps/${setId}/covers/${suffix}.jpg`;
}

/** Avatar for a player. */
export function avatarUrl(playerId: number): string {
  return `${config.avatarUrl}/${playerId}`;
}

/** Download link for a beatmap set (`.osz`), via the configured mirror. */
export function beatmapDownloadUrl(setId: number): string {
  return `${config.beatmapMirrorUrl}/${setId}`;
}
