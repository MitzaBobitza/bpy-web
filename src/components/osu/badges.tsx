import Link from "next/link";

import { cn } from "@/lib/cn";
import { formatStars } from "@/lib/format";
import { difficultyColor, difficultyNeedsLightText, statusColor, statusLabel } from "@/lib/osu/beatmaps";
import { gradeStyle } from "@/lib/osu/grades";
import { decomposeMods } from "@/lib/osu/mods";
import { countryName, flagUrl, hasFlag } from "@/lib/osu/countries";
import { roleBadges } from "@/lib/osu/privileges";

/**
 * The grade osu! awards a play, drawn as the rounded gradient pill the game
 * uses (silver for Hidden/Flashlight SS and S, gold otherwise).
 */
export function GradeBadge({ grade, size = "md" }: { grade: string; size?: "sm" | "md" | "lg" }) {
  const style = gradeStyle(grade);
  const sizes = {
    sm: "h-5 w-8 text-[11px]",
    md: "h-7 w-11 text-sm",
    lg: "h-9 w-14 text-lg",
  } as const;

  return (
    <span
      className={cn(
        "inline-grid flex-none place-items-center rounded-full font-black tracking-tight",
        sizes[size],
      )}
      style={{ background: style.background, color: style.color }}
      title={style.title}
    >
      {style.label}
    </span>
  );
}

/** Star rating, tinted with osu!'s difficulty spectrum. */
export function DifficultyPill({ stars, className }: { stars: number; className?: string }) {
  const background = difficultyColor(stars);
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-black",
        className,
      )}
      style={{
        background,
        color: difficultyNeedsLightText(stars) ? "#ffffff" : "#1a1116",
      }}
      title={`${formatStars(stars)} stars`}
    >
      {formatStars(stars)}
      <span aria-hidden="true">★</span>
    </span>
  );
}

/** Ranked status of a beatmap. */
export function StatusBadge({ status }: { status: number }) {
  const color = statusColor(status);
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
      style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
    >
      {statusLabel(status)}
    </span>
  );
}

/** Mods applied to a play, in osu!'s display order. */
export function ModList({
  mods,
  size = "md",
  className,
}: {
  mods: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const applied = decomposeMods(mods);
  if (applied.length === 0) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)}>
      {applied.map((mod) => (
        <span
          key={mod.name}
          title={mod.label}
          className={cn(
            "rounded font-black uppercase",
            "bg-pink/15 text-pink-hi ring-1 ring-inset ring-pink/30",
            size === "sm" ? "px-1 py-0 text-[10px]" : "px-1.5 py-0.5 text-[11px]",
          )}
        >
          {mod.acronym}
        </span>
      ))}
    </span>
  );
}

/**
 * A player's country, drawn as its flag.
 *
 * The flags are svg files served from `public/flags`, not emoji: emoji
 * flags render as empty boxes or bare letters on Windows, which is most of
 * the audience, and on any system without an emoji font. A country with no
 * flag on file — bancho.py's "xx" placeholder above all — falls back to the
 * code chip so something always renders.
 *
 * The ring matters: flags that are mostly white, like Japan's, would
 * otherwise dissolve into a light background and bleed into a dark one.
 */
export function CountryFlag({
  country,
  className,
  showName = false,
  size = 20,
}: {
  country: string;
  className?: string;
  showName?: boolean;
  /** Width in pixels; flags are 4:3, so the height follows. */
  size?: number;
}) {
  const code = (country || "").toLowerCase();
  const name = countryName(country);

  return (
    <span className={cn("inline-flex flex-none items-center gap-1.5", className)} title={name}>
      {hasFlag(code) ? (
        // a flag is a fixed-size static svg, so next/image has nothing to add
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flagUrl(code)}
          alt=""
          width={size}
          height={Math.round((size * 3) / 4)}
          className="flex-none rounded-[2px] object-cover ring-1 ring-inset ring-line-bright/70"
          style={{ width: size, height: Math.round((size * 3) / 4) }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="rounded-sm bg-surface-3 px-1 py-px font-mono text-[10px] font-extrabold uppercase leading-tight tracking-wide text-dim ring-1 ring-inset ring-line-bright"
        >
          {code.toUpperCase() || "??"}
        </span>
      )}
      {showName ? <span className="text-sm text-dim">{name}</span> : null}
      <span className="sr-only">{name}</span>
    </span>
  );
}

/** Link to a country's ranking board. */
export function CountryLink({ country, mode }: { country: string; mode: number }) {
  return (
    <Link
      href={`/rankings?mode=${mode}&country=${country}`}
      className="inline-flex items-center gap-1.5 text-sm text-dim transition hover:text-pink"
    >
      <CountryFlag country={country} />
      {countryName(country)}
    </Link>
  );
}

/** Staff, donor and alumni badges earned through privileges. */
export function RoleBadgeRow({ priv, className }: { priv: number; className?: string }) {
  const badges = roleBadges(priv);
  if (badges.length === 0) return null;

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      {badges.map((badge) => (
        <span
          key={badge.label}
          title={badge.description}
          className="rounded px-2 py-0.5 text-[11px] font-bold"
          style={{ color: badge.color, backgroundColor: badge.background }}
        >
          {badge.label}
        </span>
      ))}
    </span>
  );
}

/** A player's own badge, set by staff on `users.custom_badge_*`. */
export function CustomBadge({ name }: { name: string }) {
  return (
    <span className="rounded bg-violet/15 px-2 py-0.5 text-[11px] font-bold text-violet">
      {name}
    </span>
  );
}

/** Clan tag, shown before a player's name the way the game client does. */
export function ClanTag({
  clanId,
  tag,
  className,
}: {
  clanId: number | null | undefined;
  tag: string | null | undefined;
  className?: string;
}) {
  if (!tag || !clanId) return null;
  return (
    <Link
      href={`/clans/${clanId}`}
      className={cn("font-bold text-faint transition hover:text-pink", className)}
      title="Clan"
    >
      [{tag}]
    </Link>
  );
}
