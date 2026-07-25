import { cn } from "@/lib/cn";

/**
 * An osu! hit circle.
 *
 * This is the site's signature shape: the same construction the game draws
 * — a thick light rim, a tinted body, a combo number, and an approach
 * circle that shrinks onto the rim. It appears in the hero, as the loading
 * indicator, and as a decorative marker.
 */
export function HitCircle({
  size = 96,
  number,
  color = "#ff66ab",
  approach = false,
  delay = 0,
  className,
}: {
  size?: number;
  /** Combo number drawn in the middle, as in a real beatmap. */
  number?: number;
  color?: string;
  /** Animate an approach circle closing in on the rim. */
  approach?: boolean;
  /** Offset the animation so a group of circles reads as a rhythm. */
  delay?: number;
  className?: string;
}) {
  const rim = Math.max(3, size * 0.09);

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* body */}
      <div
        className={cn("absolute inset-0 rounded-full", approach && "animate-hit-pulse")}
        style={{
          background: `radial-gradient(circle at 50% 38%, ${color} 0%, ${color} 52%, rgb(0 0 0 / 0.32) 100%)`,
          border: `${rim}px solid rgb(255 255 255 / 0.92)`,
          boxShadow: `0 0 ${size * 0.35}px ${color}55, inset 0 0 ${size * 0.2}px rgb(0 0 0 / 0.35)`,
          animationDelay: `${delay}ms`,
        }}
      />
      {/* approach circle — tinted and thin, so a still frame reads as part of
          the note rather than as a stray ring */}
      {approach ? (
        <div
          className="absolute inset-0 rounded-full animate-approach"
          style={{
            border: `${Math.max(2, rim * 0.42)}px solid ${color}`,
            animationDelay: `${delay}ms`,
          }}
        />
      ) : null}
      {number !== undefined ? (
        <span
          className="relative font-black text-white/95"
          style={{ fontSize: size * 0.42, textShadow: "0 1px 6px rgb(0 0 0 / 0.5)" }}
        >
          {number}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Loading indicator: a hit circle with its approach ring closing, which is
 * what the game shows while a note is pending.
 */
export function Spinner({ size = 32, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-3" role="status">
      <HitCircle size={size} approach color="#ff66ab" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
