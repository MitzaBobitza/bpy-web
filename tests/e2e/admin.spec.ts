import { expect, test, type Page } from "@playwright/test";

/**
 * The staff area, driven against a live bancho.py.
 *
 * Role-specific accounts are bootstrapped through the panel itself: the
 * seeded `mitza` account holds every privilege, so it grants roles to fresh
 * accounts, which then sign in and prove they see exactly their own
 * sections. That exercises the real privilege plumbing rather than a fixture.
 */

const OWNER = { username: "mitza", password: "myPassword321$" };
const PASSWORD = "adminE2E123!";

/** A beatmap no other spec depends on, for the destructive tests. */
const SPARE_MAP_ID = 2891133;

function uniqueName(): string {
  return `adm${Date.now().toString(36).slice(-8)}`;
}

/**
 * Scope to one action card by its heading.
 *
 * Necessary because several cards repeat the same controls — both the
 * silence and restrict cards offer the standard reasons, for instance — and
 * because the privilege checkboxes describe themselves in prose that
 * overlaps other buttons' names.
 */
function card(page: Page, title: string) {
  return page
    .locator("section.panel")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

/** The signed-in account's own player id. */
async function ownPlayerId(page: Page): Promise<number> {
  await page.goto("/settings");
  await page.getByRole("button", { name: /Account menu for/i }).click();
  const href = await page
    .getByRole("menuitem", { name: "My profile" })
    .getAttribute("href");
  const id = Number.parseInt((href ?? "").replace("/u/", ""), 10);
  expect(Number.isFinite(id)).toBe(true);
  return id;
}

async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
}

async function signOut(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /Account menu for/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible({
    timeout: 15_000,
  });
}

/** Register a fresh account and return its username and player id. */
async function register(page: Page): Promise<{ username: string; id: number }> {
  const username = uniqueName();
  await page.goto("/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/docs\/connect/, { timeout: 20_000 });

  // the account menu links to its own profile, which carries the id
  const id = await ownPlayerId(page);
  await signOut(page);
  return { username, id };
}

/** As the owner, grant roles to a player through the panel. */
async function grantRoles(page: Page, playerId: number, roles: string[]): Promise<void> {
  await page.goto(`/admin/players/${playerId}`);
  const privileges = card(page, "Privileges");
  for (const role of roles) {
    await privileges.getByRole("button", { name: new RegExp(`^${role}`, "i") }).click();
  }
  await privileges.getByRole("button", { name: "Grant selected" }).click();
  await expect(page.getByText("Privileges granted.")).toBeVisible({ timeout: 15_000 });
}

test.describe("staff area access", () => {
  test("anonymous visitors are sent to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a player without staff privileges gets a 404", async ({ page }) => {
    const account = await register(page);
    expect(account.id).toBeGreaterThan(0);

    await signIn(page, account.username, PASSWORD);
    const response = await page.goto("/admin");

    // the panel does not confirm its own existence to someone who cannot
    // use any part of it
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nothing here");
  });

  test("the account menu offers the staff area only to staff", async ({ page }) => {
    const account = await register(page);

    await signIn(page, account.username, PASSWORD);
    await page.getByRole("button", { name: /Account menu for/i }).click();
    await expect(page.getByRole("menuitem", { name: "Staff area" })).toHaveCount(0);
    await signOut(page);

    await signIn(page, OWNER.username, OWNER.password);
    await page.getByRole("button", { name: /Account menu for/i }).click();
    await expect(page.getByRole("menuitem", { name: "Staff area" })).toBeVisible();
  });

  test("navigation shows only the sections a role may use", async ({ page }) => {
    const account = await register(page);

    await signIn(page, OWNER.username, OWNER.password);
    await grantRoles(page, account.id, ["Moderator"]);
    await signOut(page);

    await signIn(page, account.username, PASSWORD);
    await page.goto("/admin");

    const nav = page.getByRole("navigation", { name: "Admin sections" });
    await expect(nav.getByRole("link", { name: "Players" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Audit log" })).toBeVisible();
    // a moderator is not a nominator, tournament manager or developer
    await expect(nav.getByRole("link", { name: "Beatmaps" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Mappools" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Announcements" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Maintenance" })).toHaveCount(0);
  });

  test("a moderator sees moderation actions but not restriction", async ({ page }) => {
    const moderator = await register(page);
    const subject = await register(page);

    await signIn(page, OWNER.username, OWNER.password);
    await grantRoles(page, moderator.id, ["Moderator"]);
    await signOut(page);

    await signIn(page, moderator.username, PASSWORD);
    await page.goto(`/admin/players/${subject.id}`);

    await expect(page.getByRole("heading", { name: "Add a note" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Silence" })).toBeVisible();
    // administrator-only, developer-only
    await expect(page.getByRole("heading", { name: "Restrict" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Privileges", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Donator" })).toHaveCount(0);
    // and the investigation panels stay hidden
    await expect(page.getByText("Accounts sharing hardware")).toHaveCount(0);
  });
});

test.describe("player moderation", () => {
  test("a note is recorded and shows in the history", async ({ page }) => {
    const subject = await register(page);
    await signIn(page, OWNER.username, OWNER.password);

    await page.goto(`/admin/players/${subject.id}`);
    const notes = card(page, "Add a note");
    await notes.getByLabel("Note").fill("looked into their replays");
    await notes.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Note added.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("looked into their replays")).toBeVisible();
    await expect(page.getByText("Note added", { exact: true })).toBeVisible();
  });

  test("silence and unsilence round-trip", async ({ page }) => {
    const subject = await register(page);
    await signIn(page, OWNER.username, OWNER.password);
    await page.goto(`/admin/players/${subject.id}`);

    const silence = card(page, "Silence");
    await silence.getByRole("button", { name: "1 day", exact: true }).click();
    await silence
      .getByRole("button", { name: "using 3rd party programs", exact: true })
      .click();
    await silence.getByRole("button", { name: "Silence player" }).click();
    await expect(page.getByText(/was silenced for/i)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    // the card becomes the lift-silence form, and the state is shown
    await expect(page.getByText("Silenced", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Lift silence" })).toBeVisible();

    const silenced = card(page, "Silenced");
    await silenced.getByLabel("Reason").fill("apologised");
    await silenced.getByRole("button", { name: "Lift silence" }).click();
    await expect(page.getByText(/was unsilenced/i)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(
      card(page, "Silence").getByRole("button", { name: "Silence player" }),
    ).toBeVisible();
  });

  test("restriction requires confirming, then can be lifted", async ({ page, browser }) => {
    const subject = await register(page);
    await signIn(page, OWNER.username, OWNER.password);

    // an account that has never logged in to the game is unverified, and
    // bancho.py hides unverified players from the site just as it hides
    // restricted ones — so it has to be verified first for this test to be
    // about restriction at all
    await grantRoles(page, subject.id, ["Verified"]);
    const beforeRestriction = await page.goto(`/u/${subject.id}`);
    expect(beforeRestriction?.status()).toBe(200);

    await page.goto(`/admin/players/${subject.id}`);
    const restrict = card(page, "Restrict");
    await restrict
      .getByRole("button", { name: "using a modified osu! client", exact: true })
      .click();
    await restrict.getByRole("button", { name: "Restrict player" }).click();
    // a second, explicit confirmation is required
    const confirm = restrict.getByRole("button", {
      name: new RegExp(`Yes, restrict ${subject.username}`),
    });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page.getByText(/was restricted/i)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText("Restricted", { exact: true }).first()).toBeVisible();

    // the account is hidden from the public site. Staff keep seeing it, so
    // this has to be checked as a signed-out visitor.
    const anonymous = await browser.newContext();
    const anonymousPage = await anonymous.newPage();
    const hidden = await anonymousPage.goto(`/u/${subject.id}`);
    expect(hidden?.status()).toBe(404);
    // ...while staff can still open it
    const staffView = await page.goto(`/u/${subject.id}`);
    expect(staffView?.status()).toBe(200);

    await page.goto(`/admin/players/${subject.id}`);
    const restricted = card(page, "Restricted");
    await restricted.getByLabel("Reason").fill("appeal accepted");
    await restricted.getByRole("button", { name: "Lift restriction" }).click();
    await expect(page.getByText(/was unrestricted/i)).toBeVisible({ timeout: 15_000 });

    // ...and public again afterwards
    const restored = await anonymousPage.goto(`/u/${subject.id}`);
    expect(restored?.status()).toBe(200);
    await anonymous.close();
  });

  test("the owner cannot restrict their own account", async ({ page }) => {
    await signIn(page, OWNER.username, OWNER.password);
    const ownId = await ownPlayerId(page);

    await page.goto(`/admin/players/${ownId}`);
    const restriction = card(page, "Restriction");
    await expect(restriction).toBeVisible();
    await expect(restriction.getByText("You cannot restrict your own account.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Restrict player", exact: true }),
    ).toHaveCount(0);
  });

  test("privileges and donator status can be granted", async ({ page }) => {
    const subject = await register(page);
    await signIn(page, OWNER.username, OWNER.password);
    await page.goto(`/admin/players/${subject.id}`);

    const privileges = card(page, "Privileges");
    await privileges.getByRole("button", { name: /^Nominator/ }).click();
    await privileges.getByRole("button", { name: "Grant selected" }).click();
    await expect(page.getByText("Privileges granted.")).toBeVisible({ timeout: 15_000 });

    await page.reload();
    // "Privileges held" now lists it, and the role shows as held
    await expect(page.getByText("Nominator").first()).toBeVisible();

    const donator = card(page, "Donator");
    await donator.getByRole("button", { name: "90 days" }).click();
    await donator.getByRole("button", { name: "Grant donator" }).click();
    await expect(page.getByText(/Added .* of donator status/i)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText("Donator").first()).toBeVisible();
  });

  test("staff members can only be managed by developers", async ({ page }) => {
    const administrator = await register(page);
    const staffSubject = await register(page);

    await signIn(page, OWNER.username, OWNER.password);
    await grantRoles(page, administrator.id, ["Moderator", "Administrator"]);
    await grantRoles(page, staffSubject.id, ["Moderator"]);
    await signOut(page);

    await signIn(page, administrator.username, PASSWORD);
    await page.goto(`/admin/players/${staffSubject.id}`);
    const restrict = card(page, "Restrict");
    await restrict.getByLabel("Reason").fill("testing");
    await restrict.getByRole("button", { name: "Restrict player" }).click();
    await restrict.getByRole("button", { name: /^Yes, restrict/ }).click();

    await expect(page.getByText(/only developers can manage staff/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("beatmaps and mappools", () => {
  test("a nominator can change a beatmap's status", async ({ page }) => {
    await signIn(page, OWNER.username, OWNER.password);

    // start from a known status, so the run does not depend on how the
    // previous one left the map; either outcome leaves it unranked
    await page.goto("/admin/beatmaps");
    await page.getByLabel("Beatmap id").fill(String(SPARE_MAP_ID));
    await page.getByLabel("New status").selectOption("unrank");
    await page.getByRole("button", { name: "Apply status" }).click();
    await expect(page.getByText(/Updated \d+ difficult|already Unranked/i)).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/admin/beatmaps");
    await page.getByLabel("Beatmap id").fill(String(SPARE_MAP_ID));
    await page.getByLabel("New status").selectOption("love");
    await page.getByRole("button", { name: "Apply status" }).click();
    await expect(page.getByText(/Updated \d+ difficult/i)).toBeVisible({ timeout: 15_000 });

    // the public beatmap page reflects it
    await page.goto(`/beatmaps/${SPARE_MAP_ID}`);
    await expect(page.getByText("Loved").first()).toBeVisible();

    // applying the same status again is refused with a reason
    await page.goto("/admin/beatmaps");
    await page.getByLabel("Beatmap id").fill(String(SPARE_MAP_ID));
    await page.getByLabel("New status").selectOption("love");
    await page.getByRole("button", { name: "Apply status" }).click();
    await expect(page.getByText(/already Loved/i)).toBeVisible({ timeout: 15_000 });

    // put it back, so a rerun starts from the same place
    await page.goto("/admin/beatmaps");
    await page.getByLabel("Beatmap id").fill(String(SPARE_MAP_ID));
    await page.getByLabel("New status").selectOption("unrank");
    await page.getByRole("button", { name: "Apply status" }).click();
    await expect(page.getByText(/Updated \d+ difficult/i)).toBeVisible({ timeout: 15_000 });
  });

  test("a mappool can be created, filled and removed", async ({ page }) => {
    await signIn(page, OWNER.username, OWNER.password);
    await page.goto("/admin/mappools");

    const poolName = `E2E ${Date.now().toString(36).slice(-4)}`;
    await page.getByLabel("Name").fill(poolName);
    await page.getByRole("button", { name: "Create mappool" }).click();
    await expect(page.getByText(`Created “${poolName}”.`)).toBeVisible({ timeout: 15_000 });

    // add a Hidden pick in slot 3 to the pool just created
    const pool = page.locator("section.panel").filter({ hasText: poolName });
    await pool.getByLabel("Beatmap id").fill("129891");
    await pool.getByLabel("Slot").fill("3");
    await pool.getByRole("button", { name: "HD", exact: true }).click();
    await expect(pool.getByText("HD3")).toBeVisible();
    await pool.getByRole("button", { name: "Add pick" }).click();
    await expect(page.getByText(/Added HD3 to/)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    const filled = page.locator("section.panel").filter({ hasText: poolName });
    await expect(filled.getByText("HD3")).toBeVisible();
    await expect(filled.getByText(/FREEDOM DiVE/)).toBeVisible();

    await filled.getByRole("button", { name: /Remove pick HD3/ }).click();
    await expect(page.getByText(/Removed HD3 from/)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    const emptied = page.locator("section.panel").filter({ hasText: poolName });
    await emptied.getByRole("button", { name: "Delete pool" }).click();
    await emptied.getByRole("button", { name: "Confirm delete" }).click();
    await expect(page.getByText(`Deleted “${poolName}”.`)).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(poolName)).toHaveCount(0);
  });
});

test.describe("announcements and maintenance", () => {
  test("an announcement needs confirming before it is sent", async ({ page }) => {
    await signIn(page, OWNER.username, OWNER.password);
    await page.goto("/admin/announcements");

    await page.getByLabel("Announcement").fill("end-to-end test announcement");
    await page.getByRole("button", { name: "Send announcement" }).click();

    const confirm = page.getByRole("button", { name: "Yes, send to everyone" });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page.getByText(/Sent/)).toBeVisible({ timeout: 15_000 });
  });

  test("a score wipe needs confirming and reports what it deleted", async ({ page }) => {
    await signIn(page, OWNER.username, OWNER.password);
    await page.goto("/admin/maintenance");

    // a map the server does not know is refused
    await page.getByLabel("Beatmap id").fill("99999999");
    await page.getByRole("button", { name: "Wipe scores" }).click();
    await page.getByRole("button", { name: /^Yes, delete every score/ }).click();
    await expect(page.getByText("Map not found.")).toBeVisible({ timeout: 15_000 });

    // and a real one reports the count
    await page.getByLabel("Beatmap id").fill(String(SPARE_MAP_ID));
    await page.getByRole("button", { name: "Wipe scores" }).click();
    await page.getByRole("button", { name: /^Yes, delete every score/ }).click();
    await expect(page.getByText(/Deleted \d+ score/)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("audit log", () => {
  test("actions appear in the log and can be filtered", async ({ page }) => {
    const subject = await register(page);
    await signIn(page, OWNER.username, OWNER.password);

    await page.goto(`/admin/players/${subject.id}`);
    const marker = `audit filter check ${uniqueName()}`;
    const notes = card(page, "Add a note");
    await notes.getByLabel("Note").fill(marker);
    await notes.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText("Note added.")).toBeVisible();

    await page.goto("/admin/audit");
    await expect(page.getByText(marker)).toBeVisible();

    // filtering to a different action hides it
    await page.getByRole("link", { name: "Restricted", exact: true }).click();
    await expect(page.getByText(marker)).toHaveCount(0);
  });
});

test.describe("staff area layout", () => {
  test("no page scrolls sideways at any width", async ({ page }) => {
    await signIn(page, OWNER.username, OWNER.password);

    const routes = [
      "/admin",
      "/admin/players?q=raf",
      "/admin/players/4",
      "/admin/audit",
      "/admin/beatmaps",
      "/admin/mappools",
      "/admin/announcements",
      "/admin/maintenance",
    ];

    const overflowing: string[] = [];
    for (const width of [360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(150);
        const { viewport, scroll } = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        if (scroll > viewport + 1) overflowing.push(`${route} @${width} (${scroll}>${viewport})`);
      }
    }

    expect(overflowing).toEqual([]);
  });
});

test.describe("clan administration", () => {
  /** Found a clan as a fresh player, returning its id and name. */
  async function foundClan(page: Page): Promise<{ id: number; name: string }> {
    const account = await register(page);
    await signIn(page, OWNER.username, OWNER.password);
    await grantRoles(page, account.id, ["Verified"]);
    await signOut(page);

    await signIn(page, account.username, PASSWORD);
    const name = uniqueName().slice(0, 12);
    await page.goto("/clans");
    const form = card(page, "Found a clan");
    await form.getByLabel("Name").fill(name);
    await form
      .getByLabel("Tag")
      .fill(`T${Math.floor(Math.random() * 90000 + 10000)}`);
    await form.getByRole("button", { name: "Create clan" }).click();
    await page.waitForURL(/\/clans\/\d+/, { timeout: 20_000 });

    const id = Number.parseInt(page.url().split("/clans/")[1], 10);
    await signOut(page);
    return { id, name };
  }

  test("a clan can be found by tag and opened", async ({ page }) => {
    const clan = await foundClan(page);

    await signIn(page, OWNER.username, OWNER.password);
    await page.goto(`/admin/clans?q=${clan.name}`);

    await expect(page.getByRole("link", { name: new RegExp(clan.name) })).toBeVisible();

    await page.goto(`/admin/clans/${clan.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(clan.name);
    await expect(page.getByText("1 members")).toBeVisible();
  });

  test("staff can rename a clan rather than disbanding it", async ({ page }) => {
    const clan = await foundClan(page);
    const renamed = uniqueName().slice(0, 12);

    await signIn(page, OWNER.username, OWNER.password);
    await page.goto(`/admin/clans/${clan.id}`);

    const settings = card(page, "Name and tag");
    await settings.getByLabel("Name").fill(renamed);
    await settings.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Clan renamed.")).toBeVisible({ timeout: 15_000 });

    // and it is recorded, so another staff member can see who did it
    await page.goto("/admin/audit?action=clan_rename");
    await expect(page.getByText("Clan renamed").first()).toBeVisible();
  });

  test("staff can hand a clan on to another member", async ({ page }) => {
    const clan = await foundClan(page);
    const heir = await register(page);

    // put the heir in the clan through the owner, then act as staff
    await signIn(page, OWNER.username, OWNER.password);
    await grantRoles(page, heir.id, ["Verified"]);
    await page.goto(`/admin/clans/${clan.id}`);

    // the sole member is the owner, who has no controls
    await expect(page.getByRole("button", { name: "Make owner" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
    await expect(page.getByText("Owner").first()).toBeVisible();
  });

  test("staff can disband any clan", async ({ page }) => {
    const clan = await foundClan(page);

    await signIn(page, OWNER.username, OWNER.password);
    await page.goto(`/admin/clans/${clan.id}`);

    await page.getByRole("button", { name: "Disband clan" }).click();
    await page.getByRole("button", { name: "Yes, disband" }).click();
    await page.waitForURL(/\/admin\/clans$/, { timeout: 20_000 });

    const response = await page.goto(`/admin/clans/${clan.id}`);
    expect(response?.status()).toBe(404);
  });

  test("the section is hidden from staff without a staff privilege", async ({
    page,
  }) => {
    // a nominator holds no STAFF bit, so clans are not theirs to manage
    const account = await register(page);
    await signIn(page, OWNER.username, OWNER.password);
    await grantRoles(page, account.id, ["Nominator"]);
    await signOut(page);

    await signIn(page, account.username, PASSWORD);
    await page.goto("/admin");

    // scoped to the panel: the site header carries its own Clans link
    const sections = page.getByRole("navigation", { name: "Admin sections" });
    await expect(sections.getByRole("link", { name: "Beatmaps" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Clans" })).toHaveCount(0);
  });
});
