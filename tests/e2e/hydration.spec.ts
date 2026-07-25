import { expect, test } from "@playwright/test";

/**
 * Every page must hydrate cleanly.
 *
 * A hydration failure leaves the page looking correct while nothing is
 * interactive, which is easy to miss by eye — so each route is loaded with
 * the console watched for React's hydration errors and for invalid nesting
 * (an `<a>` inside an `<a>`, for instance, which React reports separately).
 */

const ROUTES = [
  "/",
  "/rankings",
  "/rankings?mode=4&sort=acc&country=ro",
  "/u/4",
  "/u/3?mode=1",
  "/beatmaps",
  "/beatmaps?status=2&mode=1",
  "/beatmaps/129891",
  "/beatmaps/129891?scope=recent",
  "/clans",
  "/clans/1",
  "/multiplayer",
  "/tournaments",
  "/search?q=raf",
  "/login",
  "/register",
  "/docs/connect",
  "/docs/rules",
  "/docs/faq",
  "/docs/terms",
  "/docs/privacy",
];

/** Console text that means the page did not hydrate correctly. */
const FATAL = /hydrat|cannot be a descendant|did not match|Each child in a list should have a unique/i;

/** Dev-only noise that says nothing about the app's correctness. */
const IGNORED = /webpack-hmr|preloaded using link preload|React DevTools|Download the React/i;

test.describe("hydration", () => {
  for (const route of ROUTES) {
    test(`hydrates cleanly: ${route}`, async ({ page }) => {
      const problems: string[] = [];

      page.on("console", (message) => {
        const text = message.text();
        if (IGNORED.test(text)) return;
        if (message.type() === "error" && FATAL.test(text)) problems.push(text.slice(0, 400));
      });
      page.on("pageerror", (error) => {
        if (FATAL.test(error.message)) problems.push(error.message.slice(0, 400));
      });

      await page.goto(route, { waitUntil: "networkidle" });
      // hydration errors surface shortly after the tree is attached
      await page.waitForTimeout(900);

      expect(problems, `hydration problems on ${route}`).toEqual([]);
    });
  }

  test("a score page hydrates cleanly", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (!IGNORED.test(text) && message.type() === "error" && FATAL.test(text)) {
        problems.push(text.slice(0, 400));
      }
    });
    page.on("pageerror", (error) => {
      if (FATAL.test(error.message)) problems.push(error.message.slice(0, 400));
    });

    // reach a real score through a leaderboard rather than guessing an id
    await page.goto("/beatmaps/129891");
    const scoreHref = await page.locator('a[href^="/scores/"]').first().getAttribute("href");
    expect(scoreHref).toBeTruthy();

    await page.goto(scoreHref!, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);

    expect(problems, `hydration problems on ${scoreHref}`).toEqual([]);
  });

  test("client components are actually interactive", async ({ page, isMobile }) => {
    await page.goto("/");

    if (isMobile) {
      // the mobile menu is pure local state, so it proves hydration ran
      const toggle = page.locator('button[aria-controls="mobile-nav"]');
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator("#mobile-nav")).toBeVisible();
    } else {
      // typing in the header search must reach the API through the proxy
      const search = page.locator('input[type="search"]').first();
      const response = page.waitForResponse(
        (res) => res.url().includes("/bancho/v2/players/search"),
        { timeout: 15_000 },
      );
      await search.fill("raf");
      expect((await response).status()).toBe(200);
      await expect(page.getByRole("link", { name: /Rafis/ }).first()).toBeVisible();
    }
  });
});
