import { cn } from "@/lib/cn";
import { avatarUrl } from "@/lib/config";

/**
 * A player's avatar.
 *
 * Avatars are served by nginx straight from bancho.py's data directory,
 * which has no file for a player who never uploaded one. Rather than
 * detecting that failure in JavaScript — which never runs in time for
 * server-rendered markup, leaving a broken-image icon on screen — the
 * fallback is painted underneath: initials on a colour derived from the
 * player's id, covered by the image only once it actually loads.
 *
 * `alt` is deliberately empty so a failed image contributes nothing
 * visible. Every avatar here sits next to the player's name in the same
 * link, so the name already carries the meaning.
 */
export function Avatar({
  playerId,
  name,
  size = 48,
  rounded = "md",
  className,
}: {
  playerId: number;
  name?: string;
  size?: number;
  rounded?: "md" | "full";
  className?: string;
}) {
  const radius = rounded === "full" ? "rounded-full" : "rounded-lg";
  // spread the hue across the wheel so adjacent ids look distinct
  const hue = (playerId * 47) % 360;
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn(
        "relative grid flex-none place-items-center overflow-hidden ring-1 ring-inset ring-white/10",
        radius,
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, hsl(${hue} 45% 38%), hsl(${(hue + 40) % 360} 45% 22%))`,
      }}
    >
      <span
        className="select-none font-black text-white/90"
        style={{ fontSize: size * 0.42 }}
        aria-hidden="true"
      >
        {initial}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- avatars come from
          the operator's own avatar host, which the image optimiser cannot reach
          in every deployment; a plain img keeps them working everywhere. */}
      <img
        src={avatarUrl(playerId)}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}
