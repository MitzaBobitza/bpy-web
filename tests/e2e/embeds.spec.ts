import { expect, test, type Page } from "@playwright/test";

/**
 * What a chat app sees when someone posts a link.
 *
 * Discord, Slack and the rest fetch the page as a plain http client, read
 * the Open Graph tags out of the html and never run JavaScript — so these
 * assertions deliberately read the served markup rather than the DOM after
 * hydration.
 */

/** Read one meta tag's content from the served html. */
async function meta(page: Page, path: string, property: string): Promise<string | null> {
  const response = await page.request.get(path);
  expect(response.status(), `${path} should render`).toBe(200);

  const html = await response.text();
  const pattern = new RegExp(
    `<meta (?:property|name)="${property}" content="([^"]*)"`,
    "i",
  );
  return html.match(pattern)?.[1] ?? null;
}

/** Decode the entities Next escapes into attribute values. */
function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

const SHAREABLE = [
  { path: "/", label: "the home page" },
  { path: "/u/4", label: "a profile" },
  { path: "/beatmaps/129891", label: "a beatmap" },
  { path: "/clans/1", label: "a clan" },
  { path: "/rankings", label: "the rankings" },
  { path: "/docs/faq", label: "a help page" },
];

test.describe("link previews", () => {
  for (const { path, label } of SHAREABLE) {
    test(`${label} carries a title, description and image`, async ({ page }) => {
      const title = await meta(page, path, "og:title");
      const description = await meta(page, path, "og:description");
      const image = await meta(page, path, "og:image");

      expect(title, `${path} og:title`).toBeTruthy();
      expect(description, `${path} og:description`).toBeTruthy();
      expect(image, `${path} og:image`).toBeTruthy();

      // absolute, or a chat app has nothing to resolve it against
      expect(image).toMatch(/^https?:\/\//);
    });
  }

  test("each page describes itself rather than the site", async ({ page }) => {
    // the failure this guards against is every link unfurling under the
    // server's own name, which is what happens if openGraph is left to the
    // root layout
    const profile = decode((await meta(page, "/u/4", "og:title")) ?? "");
    const beatmap = decode((await meta(page, "/beatmaps/129891", "og:title")) ?? "");
    const clan = decode((await meta(page, "/clans/1", "og:title")) ?? "");
    const home = decode((await meta(page, "/", "og:title")) ?? "");

    expect(profile).toBe("Rafis");
    expect(beatmap).toContain("FREEDOM DiVE");
    expect(clan).toContain("[SUN]");
    expect(new Set([profile, beatmap, clan, home]).size).toBe(4);
  });

  test("a profile's description names the player", async ({ page }) => {
    const description = decode((await meta(page, "/u/4", "og:description")) ?? "");
    expect(description).toContain("Rafis");
  });

  test("the wide card is requested, and an accent colour offered", async ({ page }) => {
    // Discord uses twitter:card to pick between a thumbnail and a
    // full-width image, and theme-color to tint the embed's edge
    expect(await meta(page, "/u/4", "twitter:card")).toBe("summary_large_image");
    expect(await meta(page, "/", "theme-color")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("canonical urls point at the page itself", async ({ page }) => {
    const response = await page.request.get("/clans/1");
    const html = await response.text();
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];

    expect(canonical).toBeTruthy();
    expect(canonical).toMatch(/\/clans\/1$/);
  });
});

test.describe("share images", () => {
  const CARDS = [
    { path: "/opengraph-image", label: "the site" },
    { path: "/u/4/opengraph-image", label: "a profile" },
    { path: "/beatmaps/129891/opengraph-image", label: "a beatmap" },
    { path: "/clans/1/opengraph-image", label: "a clan" },
  ];

  for (const { path, label } of CARDS) {
    test(`${label} renders a png at the size chat apps expect`, async ({ page }) => {
      const response = await page.request.get(path);

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");

      const body = await response.body();
      // a truncated or error-page response would not be a real png
      expect(body.byteLength).toBeGreaterThan(10_000);
      expect(body.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );

      // the IHDR chunk carries the dimensions, big-endian from byte 16
      expect(body.readUInt32BE(16)).toBe(1200);
      expect(body.readUInt32BE(20)).toBe(630);
    });
  }

  test("a card for something that does not exist still renders", async ({ page }) => {
    // a chat app should get the server's branding, not a broken image
    const response = await page.request.get("/u/definitely-not-a-player/opengraph-image");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  });
});
