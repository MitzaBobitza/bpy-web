import { HitCircle } from "@/components/ui/HitCircle";

/**
 * A playable-looking osu! pattern, rendered at hero scale.
 *
 * This is the page's thesis: rather than describing a rhythm game, the hero
 * shows one. The seven circles are laid out as a real jump pattern, joined
 * by the dashed follow points the game draws between notes, and each
 * approach circle closes on the beat with a staggered delay so the whole
 * figure reads as a rhythm rather than as decoration.
 */

/**
 * Circle centres, as percentages of the container. Spaced far enough apart
 * that the approach rings never collide at full extent.
 */
const PATTERN: { x: number; y: number }[] = [
  { x: 14, y: 18 },
  { x: 47, y: 10 },
  { x: 79, y: 22 },
  { x: 88, y: 53 },
  { x: 58, y: 66 },
  { x: 24, y: 60 },
  { x: 11, y: 90 },
];

/** One beat of separation between consecutive notes, in milliseconds. */
const BEAT_MS = 220;

export function HeroPattern() {
  return (
    <div className="relative aspect-square w-full" aria-hidden="true">
      {/* follow points: the trail osu! draws from one note to the next */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <polyline
          points={PATTERN.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="rgb(255 255 255 / 0.22)"
          strokeWidth="0.5"
          strokeDasharray="1.6 2.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {PATTERN.map((point, index) => (
        <div
          key={index}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <HitCircle
            size={index === 0 ? 78 : 66}
            number={index + 1}
            approach
            delay={index * BEAT_MS}
            className="drop-shadow-[0_6px_24px_rgb(0_0_0/0.5)]"
          />
        </div>
      ))}
    </div>
  );
}
