import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ReactElement } from "react";

import { config } from "@/lib/config";

/**
 * Shared pieces for the share images chat apps and search engines render
 * when someone posts a link.
 *
 * These are drawn by satori, which supports a deliberately small subset of
 * CSS: flexbox only, no grid, no cascade, every element needs an explicit
 * `display`. Keep the markup flat and the styles inline.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** The interface palette, so a shared link looks like the site it points at. */
export const og = {
  void: "#0d090b",
  surface: "#221822",
  line: "#3d2d38",
  pink: "#ff66ab",
  pinkLo: "#d14d88",
  ink: "#f7eef4",
  dim: "#bfaab8",
  faint: "#8a7480",
  gold: "#ffcc22",
  sky: "#4fa3f7",
} as const;

type FontData = { name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" };

let fontCache: FontData[] | null = null;

/** Nunito, vendored so image generation never needs the network. */
export async function ogFonts(): Promise<FontData[]> {
  if (fontCache) return fontCache;

  const directory = path.join(process.cwd(), "src/lib/og-assets");
  const [regular, extraBold] = await Promise.all([
    readFile(path.join(directory, "Nunito-Regular.ttf")),
    readFile(path.join(directory, "Nunito-ExtraBold.ttf")),
  ]);

  fontCache = [
    { name: "Nunito", data: regular.buffer as ArrayBuffer, weight: 400, style: "normal" },
    { name: "Nunito", data: extraBold.buffer as ArrayBuffer, weight: 800, style: "normal" },
  ];
  return fontCache;
}

/**
 * Fetch an image and inline it as a data URI.
 *
 * satori cannot load a remote image itself, and a host that is slow or
 * unreachable would otherwise fail the whole card rather than one avatar,
 * so this always resolves — callers draw a fallback when it returns null.
 */
export async function inlineImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    const type = response.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;

    const body = Buffer.from(await response.arrayBuffer());
    // a card is 1200x630; anything above a megabyte is not worth inlining
    if (body.byteLength > 1_000_000) return null;

    return `data:${type};base64,${body.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The card background: the site's near-black, lit from the top left. */
export function OgFrame({
  children,
  cover,
}: {
  children: ReactElement;
  /** Optional artwork, dimmed behind the content. */
  cover?: string | null;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: og.void,
        position: "relative",
      }}
    >
      {cover ? (
        <img
          src={cover}
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: OG_SIZE.width,
            height: OG_SIZE.height,
            objectFit: "cover",
            opacity: 0.28,
          }}
        />
      ) : null}

      {/* keeps text legible over artwork, and gives the plain cards depth */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          display: "flex",
          backgroundImage: `linear-gradient(120deg, ${og.void} 20%, rgba(13,9,11,0.72) 55%, rgba(209,77,136,0.28) 100%)`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: 64,
          position: "relative",
        }}
      >
        {children}
      </div>

      {/* the accent rule along the bottom, as on the site's panels */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          display: "flex",
          width: OG_SIZE.width,
          height: 10,
          backgroundColor: og.pink,
        }}
      />
    </div>
  );
}

/** The server's wordmark, bottom-left on every card. */
export function OgWordmark({ label }: { label?: string }): ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          display: "flex",
          width: 40,
          height: 40,
          borderRadius: 20,
          border: `6px solid ${og.pink}`,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: og.ink }}>
          {config.serverName}
        </div>
        {label ? (
          <div style={{ display: "flex", fontSize: 20, color: og.faint }}>{label}</div>
        ) : null}
      </div>
    </div>
  );
}

/** A labelled figure, as used across the site's stat panels. */
export function OgStat({
  label,
  value,
  accent = og.ink,
}: {
  label: string;
  value: string;
  accent?: string;
}): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          letterSpacing: 2,
          color: og.faint,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 800, color: accent }}>
        {value}
      </div>
    </div>
  );
}

/**
 * A country's flag, read off disk and inlined.
 *
 * satori cannot fetch, and these are the same files the site serves from
 * `public/flags`, so there is one source of truth for what a flag looks
 * like. Returns null for a country with no flag, so callers can fall back
 * to the code.
 */
export async function inlineFlag(country: string): Promise<string | null> {
  const code = (country || "").toLowerCase();
  if (!/^[a-z]{2}$/.test(code) || code === "xx") return null;

  try {
    const svg = await readFile(
      path.join(process.cwd(), "public/flags", `${code}.svg`),
    );
    return `data:image/svg+xml;base64,${svg.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * A star, for difficulty ratings.
 *
 * Drawn as an inline svg rather than the ★ character: the vendored Nunito
 * is a latin subset, so the glyph would come out as a missing-character
 * box. This also keeps the shape identical whatever the fonts contain.
 */
export function OgStar({
  size: pixels,
  fill,
}: {
  size: number;
  fill: string;
}): ReactElement {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}"><path d="M12 1.8l3.1 6.66L22 9.5l-5.1 4.9 1.25 7.05L12 18.1l-6.15 3.35L7.1 14.4 2 9.5l6.9-1.04z"/></svg>`;
  return (
    <img
      src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`}
      width={pixels}
      height={pixels}
      style={{ width: pixels, height: pixels }}
    />
  );
}

/** Cut a string to fit; satori will not wrap gracefully in a fixed row. */
export function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
