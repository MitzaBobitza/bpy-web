import { expect, test } from "@playwright/test";

/**
 * Public pages, read against live data from bancho.py. These assert that
 * real records reach the page — not just that it returned 200.
 */

test.describe("public pages", () => {
  test("home shows live server counters and the top of the leaderboard", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Click circles");

    // the counters come from /v2/server/stats and the listing meta totals
    const registered = page.getByText("Registered players").locator("xpath=following-sibling::dd");
    await expect(registered).not.toHaveText("–");

    // the leaderboard preview must list real players, each linking to a profile
    const profileLinks = page.locator('a[href^="/u/"]');
    expect(await profileLinks.count()).toBeGreaterThan(0);
  });

  test("rankings filter by mode, sort and country through the URL", async ({ page }) => {
    await page.goto("/rankings");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Global rankings");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow.locator('a[href^="/u/"]')).toHaveCount(1);

    // switching sort changes the board and stays linkable
    await page.goto("/rankings?sort=plays");
    await expect(page.locator("body")).toContainText("sorted by play count");

    // relax has its own board
    await page.goto("/rankings?mode=4");
    await expect(page.locator("body")).toContainText("osu! (Relax)");

    // an invalid mode falls back rather than erroring
    await page.goto("/rankings?mode=7");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a country board is reachable and scoped", async ({ page }) => {
    await page.goto("/rankings?country=ro");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Romania");
  });

  test("profile shows stats, ranks and plays for the selected mode", async ({ page }) => {
    await page.goto("/u/4");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rafis");
    await expect(page.getByText("Performance", { exact: true })).toBeVisible();
    await expect(page.getByText("Ranked score")).toBeVisible();

    // ranks come from redis, so a non-empty value proves that path works
    const global = page.getByText("Global", { exact: true }).locator("xpath=following-sibling::dd");
    await expect(global).toContainText("#");

    // switching mode keeps us on the profile
    await page.goto("/u/4?mode=1");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rafis");
  });

  test("profile is reachable by username as well as id", async ({ page }) => {
    await page.goto("/u/Rafis");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rafis");
  });

  test("beatmap listing filters and links into difficulties", async ({ page }) => {
    await page.goto("/beatmaps");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Beatmap listing");

    const cards = page.getByRole("listitem");
    expect(await cards.count()).toBeGreaterThan(0);

    await page.goto("/beatmaps?status=2");
    await expect(page.locator("body")).toContainText("Ranked");
  });

  test("beatmap page shows difficulty stats and its leaderboard", async ({ page }) => {
    await page.goto("/beatmaps/129891");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("FREEDOM DiVE");
    await expect(page.getByText("Approach rate")).toBeVisible();
    await expect(page.getByText("Max combo").first()).toBeVisible();

    // the leaderboard rows come from /v2/maps/{id}/scores
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first().locator('a[href^="/u/"]')).toHaveCount(1);
  });

  test("score page shows the result and links to its map and player", async ({ page }) => {
    await page.goto("/beatmaps/129891");
    // follow a real score id from the leaderboard rather than inventing one
    const scoreLink = page.locator('a[href^="/scores/"]').first();
    await expect(scoreLink).toBeVisible();
    await scoreLink.click();

    await expect(page.getByText("Hit breakdown")).toBeVisible();
    await expect(page.getByText("Accuracy", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download replay" })).toBeVisible();
  });

  test("clans list and detail resolve membership", async ({ page }) => {
    await page.goto("/clans");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clans");

    // the header logo links home with the same accessible name as the
    // server, so the clan link is taken from the listing itself
    const firstClan = page.locator('a[href^="/clans/"]').first();
    await firstClan.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Members").first()).toBeVisible();

    // membership comes from the v1 API, the only place it is exposed
    await expect(page.getByText("Owner").first()).toBeVisible();
    await expect(page.locator('a[href^="/u/"]').first()).toBeVisible();
  });

  test("multiplayer and tournaments render without live data", async ({ page }) => {
    await page.goto("/multiplayer");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Multiplayer");

    await page.goto("/tournaments");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tournament mappools");
    // bancho.py only exposes a pool while its creator is connected in game,
    // so an empty list is the expected state with nobody online
    await expect(page.getByText(/mappool/i).first()).toBeVisible();
  });

  test("player search returns matches", async ({ page }) => {
    await page.goto("/search?q=raf");
    await expect(page.getByRole("link", { name: /Rafis/ }).first()).toBeVisible();
  });

  test("search rejects a one-character query with guidance", async ({ page }) => {
    await page.goto("/search?q=r");
    await expect(page.getByText("Keep typing")).toBeVisible();
  });

  test("missing players and maps give a 404 page, not an error", async ({ page }) => {
    const player = await page.goto("/u/99999999");
    expect(player?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nothing here");

    const map = await page.goto("/beatmaps/99999999");
    expect(map?.status()).toBe(404);
  });

  test("help pages are all reachable from the sidebar", async ({ page }) => {
    await page.goto("/docs/connect");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Connect osu!");

    for (const name of ["Rules", "FAQ", "Terms of service", "Privacy policy"]) {
      await page.getByRole("navigation", { name: "Documentation" }).getByRole("link", { name }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});

test.describe("country flags", () => {
  test("render as images, not codes, on the rankings", async ({ page }) => {
    const failed: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/flags/") && response.status() !== 200) {
        failed.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/rankings");

    const flags = page.locator('img[src^="/flags/"]');
    await expect(flags.first()).toBeVisible();
    expect(await flags.count()).toBeGreaterThan(5);
    expect(failed, "flag images that did not load").toEqual([]);
  });

  test("carry the country name for assistive technology", async ({ page }) => {
    await page.goto("/u/4");

    // the image itself is decorative; the name is what gets announced
    const flag = page.locator('img[src="/flags/hu.svg"]').first();
    await expect(flag).toBeVisible();
    await expect(flag).toHaveAttribute("alt", "");
    await expect(page.getByText("Hungary").first()).toBeVisible();
  });

  test("really are drawn, not just requested", async ({ page }) => {
    await page.goto("/u/4");

    const flag = page.locator('img[src="/flags/hu.svg"]').first();
    // a 404 or a broken svg leaves naturalWidth at 0
    const drawn = await flag.evaluate(
      (element) => (element as HTMLImageElement).naturalWidth > 0,
    );
    expect(drawn).toBe(true);
  });
});
