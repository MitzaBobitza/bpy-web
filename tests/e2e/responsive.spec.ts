import { expect, test } from "@playwright/test";

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
