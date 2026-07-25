import { beatmapCoverUrl } from "@/lib/config";
import { cn } from "@/lib/cn";

/**
 * Beatmap set cover art.
 *
 * Covers are hosted by osu!'s asset CDN and simply do not exist for maps
 * uploaded to a private server. As with avatars, the fallback is painted
 * underneath — a hatched gradient keyed to the set id — and the image
 * covers it only once it loads, so a missing cover never shows a broken
 * image and needs no JavaScript to recover.
 */
export function BeatmapCover({
  setId,
  size = "cover",
  className,
  children,
  /**
   * How much to darken the art. "heavy" is for covers carrying text on top;
   * "light" suits the narrow strip beside a score row, where a heavy scrim
   * would leave nothing but a black sliver.
   */
  scrim = "heavy",
}: {
  setId: number;
  size?: "card" | "cover" | "list";
  className?: string;
  children?: React.ReactNode;
  scrim?: "heavy" | "light" | "none";
}) {
  const hue = (setId * 37) % 360;

  return (
    <div className={cn("relative overflow-hidden bg-void", className)}>
      <div
        className="absolute inset-0 hatched"
        style={{
          background: `linear-gradient(130deg, hsl(${hue} 38% 26%), hsl(${(hue + 55) % 360} 40% 14%))`,
        }}
        aria-hidden="true"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- third-party CDN
          art, loaded directly so no deployment needs an image optimiser. */}
      <img
        src={beatmapCoverUrl(setId, size)}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {scrim === "heavy" ? (
        <div
          className="absolute inset-0 bg-gradient-to-r from-void/95 via-void/75 to-void/40"
          aria-hidden="true"
        />
      ) : scrim === "light" ? (
        <div className="absolute inset-0 bg-void/35" aria-hidden="true" />
      ) : null}
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}
