import { expect, test } from "@playwright/test";

import { requireStaffAccount, STAFF } from "./credentials";

/**
 * The page body must never scroll sideways.
 *
 * Wide content — score tables in particular — is allowed to scroll, but
 * only inside its own container. Grid and flex items default to a
 * min-content floor, so a single-column mobile layout is easy to push past
 * the viewport without noticing; this catches that.
 */

const ROUTES = [
  "/",
  "/rankings",
  "/u/4",
  "/beatmaps",
  "/beatmaps/129891",
  "/clans",
  "/clans/1",
  "/multiplayer",
  "/tournaments",
  "/search?q=raf",
  "/login",
  "/register",
  "/docs/connect",
  "/docs/faq",
];

const WIDTHS = [360, 412, 768, 1024, 1440];

test.describe("responsive layout", () => {
  for (const width of WIDTHS) {
    test(`no sideways scroll at ${width}px`, async ({ page }) => {
      const overflowing: string[] = [];

      for (const route of ROUTES) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(150);

        const { viewport, scroll } = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));

        // a pixel of slack for sub-pixel rounding
        if (scroll > viewport + 1) overflowing.push(`${route} (${scroll} > ${viewport})`);
      }

      expect(overflowing, `routes overflowing at ${width}px`).toEqual([]);
    });
  }

  /**
   * Signed-out pages miss the widest content on the site: management
   * controls only render for someone who may use them, and a row of
   * buttons beside a member's stats is exactly what overflows a phone.
   */
  test("pages behind a sign-in do not scroll sideways either", async ({ page }) => {
    requireStaffAccount();

    await page.goto("/login");
    await page.getByLabel("Username").fill(STAFF.username);
    await page.getByLabel("Password").fill(STAFF.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20_000,
    });

    const routes = [
      "/clans/1", // clan management, as its owner
      "/clans", // the create form and invitation inbox
      "/admin/players/4", // the widest staff page
      "/admin/mappools",
      "/settings",
      "/friends",
    ];

    const overflowing: string[] = [];
    for (const width of [360, 412, 768]) {
      for (const route of routes) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(150);

        const { viewport, scroll } = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));

        if (scroll > viewport + 1) {
          overflowing.push(`${route} at ${width}px (${scroll} > ${viewport})`);
        }
      }
    }

    expect(overflowing, "signed-in routes overflowing").toEqual([]);
  });

  test("a wide score table scrolls inside its own container", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 900 });
    await page.goto("/beatmaps/129891");

    // the table is wider than the phone, and its wrapper is what scrolls
    const wrapper = page.locator("div.overflow-x-auto").filter({ has: page.locator("table") });
    await expect(wrapper).toHaveCount(1);

    const scrollable = await wrapper.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    );
    expect(scrollable).toBe(true);
  });
});
