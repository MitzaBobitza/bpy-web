import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  COUNTRIES,
  COUNTRY_OPTIONS,
  countryName,
  flagUrl,
  hasFlag,
} from "@/lib/osu/countries";

const FLAG_DIR = path.join(process.cwd(), "public/flags");

describe("country names", () => {
  it("reads bancho.py's codes case-insensitively", () => {
    expect(countryName("hu")).toBe("Hungary");
    expect(countryName("HU")).toBe("Hungary");
  });

  it("calls anything it does not know Unknown", () => {
    expect(countryName("zz")).toBe("Unknown");
    expect(countryName("")).toBe("Unknown");
    expect(countryName("xx")).toBe("Unknown");
  });
});

describe("flags", () => {
  it("has an image on disk for every country it claims to have", () => {
    // the check the component relies on: it renders an <img> whenever
    // hasFlag is true, so a missing file would be a broken image
    const missing = Object.keys(COUNTRIES)
      .filter((code) => hasFlag(code))
      .filter((code) => !existsSync(path.join(FLAG_DIR, `${code}.svg`)));

    expect(missing).toEqual([]);
  });

  it("covers every country a player can pick in settings", () => {
    const missing = COUNTRY_OPTIONS.filter((option) => !hasFlag(option.code));
    expect(missing).toEqual([]);
  });

  it("ships no flag the country list does not name", () => {
    // an orphan file is dead weight nothing can ever render
    const orphans = readdirSync(FLAG_DIR)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.replace(/\.svg$/, ""))
      .filter((code) => !(code in COUNTRIES));

    expect(orphans).toEqual([]);
  });

  it("has no flag for the unknown-country placeholder", () => {
    // bancho.py stores "xx" when it cannot geolocate; there is nothing to
    // draw, so the component falls back to the code chip
    expect(hasFlag("xx")).toBe(false);
    expect(existsSync(path.join(FLAG_DIR, "xx.svg"))).toBe(false);
  });

  it("refuses codes that are not countries", () => {
    expect(hasFlag("zz")).toBe(false);
    expect(hasFlag("")).toBe(false);
    expect(hasFlag("hungary")).toBe(false);
  });

  it("accepts either case, as bancho.py stores lower case", () => {
    expect(hasFlag("HU")).toBe(true);
    expect(flagUrl("HU")).toBe("/flags/hu.svg");
  });

  it("serves every flag from the same place", () => {
    expect(flagUrl("jp")).toBe("/flags/jp.svg");
  });
});
