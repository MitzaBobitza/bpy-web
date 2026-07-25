import { expect, test } from "@playwright/test";

/**
 * The full account lifecycle against a live bancho.py: register, sign in,
 * change the profile, manage friends and favourites, sign out.
 *
 * Form errors are located inside the form, because Next's route announcer
 * is also exposed with role="alert".
 *
 * Each run registers a fresh account, so the suite is repeatable without
 * cleaning up state.
 */

/** bancho.py requires 8-32 characters with more than 3 distinct ones. */
const PASSWORD = "e2ePassw0rd!";

function uniqueName(): string {
  // usernames are capped at 15 characters
  return `e2e${Date.now().toString(36).slice(-8)}`;
}

test.describe("account lifecycle", () => {
  test("registers, signs in, edits the profile and signs out", async ({ page }) => {
    const username = uniqueName();

    // ── register ────────────────────────────────────────────────────────
    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.test`);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    // registration signs the new player straight in and points them at the
    // connection guide
    await expect(page).toHaveURL(/\/docs\/connect/, { timeout: 20_000 });

    // ── signed-in state is visible ──────────────────────────────────────
    await expect(page.getByRole("button", { name: new RegExp(username, "i") })).toBeVisible();

    // ── the session survives a reload, proving the cookie round-tripped ──
    await page.reload();
    await expect(page.getByRole("button", { name: new RegExp(username, "i") })).toBeVisible();

    // ── settings ────────────────────────────────────────────────────────
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Settings");

    const about = page.getByLabel("About me");
    await about.fill("Written by the end-to-end test.");
    await page.getByLabel("Country").selectOption("jp");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    // ── the change shows on the profile ─────────────────────────────────
    await page.goto("/settings");
    await expect(page.getByLabel("About me")).toHaveValue("Written by the end-to-end test.");

    // ── a bad password change is rejected with a reason ──────────────────
    await page.getByLabel("Current password").fill("definitely-not-it");
    await page.getByLabel("New password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm new password").fill(PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText(/Incorrect current password/i)).toBeVisible();

    // ── mismatched confirmation is caught before the request ─────────────
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm new password").fill("something-else");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText(/do not match/i)).toBeVisible();

    // ── sign out ────────────────────────────────────────────────────────
    await page.getByRole("button", { name: new RegExp(username, "i") }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("rejects a duplicate username with the server's message", async ({ page }) => {
    await page.goto("/register");
    // "mitza" is seeded, so this collides
    await page.getByLabel("Username").fill("mitza");
    await page.getByLabel("Email").fill(`dupe${Date.now()}@example.test`);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.locator('form [role="alert"]')).toContainText(/taken/i);
  });

  test("rejects a password that breaks the server's rules", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Username").fill(uniqueName());
    await page.getByLabel("Email").fill(`weak${Date.now()}@example.test`);
    // 8+ characters but only 2 distinct ones, which bancho.py refuses
    await page.getByLabel("Password").fill("aaaabbbb");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.locator('form [role="alert"]')).toContainText(/unique characters/i);
  });

  test("rejects wrong sign-in credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("mitza");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.locator('form [role="alert"]')).toContainText(/Incorrect username or password/i);
  });

  test("sends anonymous visitors from a private page to sign-in and back", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings|\/login\?next=\/settings/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  });

  test("friends and favourites can be managed while signed in", async ({ page }) => {
    const username = uniqueName();

    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.test`);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/docs\/connect/, { timeout: 20_000 });

    // ── add a friend from their profile ─────────────────────────────────
    await page.goto("/u/4");
    const addFriend = page.getByRole("button", { name: "Add friend" });
    await expect(addFriend).toBeVisible();
    await addFriend.click();
    await expect(page.getByRole("button", { name: "Remove friend" })).toBeVisible();

    // ── the friends page lists them ─────────────────────────────────────
    await page.goto("/friends");
    await expect(page.getByRole("link", { name: /Rafis/ })).toBeVisible();

    // ── and removing works ─────────────────────────────────────────────
    await page.goto("/u/4");
    await page.getByRole("button", { name: "Remove friend" }).click();
    await expect(page.getByRole("button", { name: "Add friend" })).toBeVisible();

    // ── favourite a beatmap set ────────────────────────────────────────
    await page.goto("/beatmaps/129891");
    const favourite = page.getByRole("button", { name: "Favourite" });
    await expect(favourite).toBeVisible();
    await favourite.click();
    await expect(page.getByRole("button", { name: "Favourited" })).toBeVisible();

    await page.goto("/favourites");
    await expect(page.getByRole("heading", { name: "FREEDOM DiVE" })).toBeVisible();

    // ── and unfavourite ────────────────────────────────────────────────
    await page.goto("/beatmaps/129891");
    await page.getByRole("button", { name: "Favourited" }).click();
    await expect(page.getByRole("button", { name: "Favourite", exact: true })).toBeVisible();
  });

  test("own profile offers editing rather than a friend button", async ({ page }) => {
    const username = uniqueName();

    await page.goto("/register");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Email").fill(`${username}@example.test`);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/docs\/connect/, { timeout: 20_000 });

    await page.getByRole("button", { name: new RegExp(username, "i") }).click();
    await page.getByRole("menuitem", { name: "My profile" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(username);
    await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add friend" })).toHaveCount(0);
  });
});
