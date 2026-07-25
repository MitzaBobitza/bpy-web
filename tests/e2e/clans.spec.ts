import { expect, test, type Page } from "@playwright/test";

/**
 * Clan management, driven against a live bancho.py.
 *
 * Every account here is registered through the site and then verified via
 * the staff area, because a player who has never logged in to the game is
 * hidden server-wide -- and so cannot be invited to a clan. That is the
 * same rule that keeps them out of player search.
 */

const STAFF = { username: "mitza", password: "myPassword321$" };
const PASSWORD = "clanE2E123!";

function uniqueName(): string {
  return `cln${Date.now().toString(36).slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
}

/** A tag short enough for the 6-character limit, and unlikely to collide. */
function uniqueTag(): string {
  return `T${Math.floor(Math.random() * 90000 + 10000)}`;
}

/** Scope to one card by its heading; several share control names. */
function card(page: Page, title: string) {
  return page
    .locator("section.panel")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

/** The row for one member of the roster. */
function memberRow(page: Page, username: string) {
  return page.locator("li").filter({ has: page.getByRole("link", { name: username }) });
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

/**
 * Register an account and make it visible to the rest of the server.
 *
 * Registration leaves an account unverified, which hides it everywhere --
 * including from the clan invite form. Verifying stands in for the first
 * in-game login.
 */
async function createPlayer(page: Page): Promise<string> {
  const username = uniqueName();
  await page.goto("/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/docs\/connect/, { timeout: 20_000 });

  const id = await ownPlayerId(page);
  await signOut(page);

  await signIn(page, STAFF.username, STAFF.password);
  await page.goto(`/admin/players/${id}`);
  const privileges = card(page, "Privileges");
  await privileges.getByRole("button", { name: /^Verified/i }).click();
  await privileges.getByRole("button", { name: "Grant selected" }).click();
  await expect(page.getByText("Privileges granted.")).toBeVisible({ timeout: 15_000 });
  await signOut(page);

  return username;
}

/** Found a clan as the signed-in player, returning its url. */
async function foundClan(page: Page, name = uniqueName().slice(0, 12)): Promise<string> {
  await page.goto("/clans");
  const form = card(page, "Found a clan");
  await form.getByLabel("Name").fill(name);
  await form.getByLabel("Tag").fill(uniqueTag());
  await form.getByRole("button", { name: "Create clan" }).click();
  await page.waitForURL(/\/clans\/\d+/, { timeout: 20_000 });
  return page.url();
}

/** Invite a player and have them accept, leaving them signed in. */
async function inviteAndAccept(
  page: Page,
  clanUrl: string,
  owner: string,
  invitee: string,
): Promise<void> {
  const invite = card(page, "Invite a player");
  await invite.getByLabel("Username").fill(invitee);
  await invite.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(`${invitee} was invited.`)).toBeVisible({
    timeout: 15_000,
  });

  await signOut(page);
  await signIn(page, invitee, PASSWORD);
  await page.goto("/clans");
  await page.getByRole("button", { name: "Accept" }).first().click();
  await page.waitForURL(/\/clans\/\d+/, { timeout: 20_000 });

  await signOut(page);
  await signIn(page, owner, PASSWORD);
  await page.goto(clanUrl);
}

test.describe("clan visibility", () => {
  test("anonymous visitors see the roster but no controls", async ({ page }) => {
    await page.goto("/clans/1");

    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Disband clan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  });

  test("the listing offers a clan to signed-out visitors without a form", async ({
    page,
  }) => {
    await page.goto("/clans");

    await expect(page.getByRole("heading", { name: "All clans" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create clan" })).toHaveCount(0);
  });

  test("a non-member sees no management controls", async ({ page }) => {
    const outsider = await createPlayer(page);
    await signIn(page, outsider, PASSWORD);

    await page.goto("/clans/1");

    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Leave clan" })).toHaveCount(0);
  });
});

test.describe("founding a clan", () => {
  test("the creator becomes its owner", async ({ page }) => {
    const founder = await createPlayer(page);
    await signIn(page, founder, PASSWORD);

    const name = uniqueName().slice(0, 12);
    await foundClan(page, name);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(page.getByText("Your rank")).toBeVisible();
    // the owner's own controls
    await expect(page.getByRole("button", { name: "Send invite" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Disband clan" })).toBeVisible();
    // and no way to simply walk out
    await expect(page.getByRole("button", { name: "Leave clan" })).toHaveCount(0);
    await expect(
      page.getByText("As owner you must hand the clan on, or disband it."),
    ).toBeVisible();
  });

  test("a second clan is refused while you are in one", async ({ page }) => {
    const founder = await createPlayer(page);
    await signIn(page, founder, PASSWORD);
    await foundClan(page);

    // the form is replaced by a link to the clan they already have
    await page.goto("/clans");
    await expect(page.getByRole("link", { name: "Go to your clan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create clan" })).toHaveCount(0);
  });

  test("a taken tag is reported rather than silently failing", async ({ page }) => {
    const first = await createPlayer(page);
    await signIn(page, first, PASSWORD);
    const tag = uniqueTag();
    await page.goto("/clans");
    let form = card(page, "Found a clan");
    await form.getByLabel("Name").fill(uniqueName().slice(0, 12));
    await form.getByLabel("Tag").fill(tag);
    await form.getByRole("button", { name: "Create clan" }).click();
    await page.waitForURL(/\/clans\/\d+/, { timeout: 20_000 });
    await signOut(page);

    const second = await createPlayer(page);
    await signIn(page, second, PASSWORD);
    await page.goto("/clans");
    form = card(page, "Found a clan");
    await form.getByLabel("Name").fill(uniqueName().slice(0, 12));
    await form.getByLabel("Tag").fill(tag);
    await form.getByRole("button", { name: "Create clan" }).click();

    await expect(
      page.getByText("That tag has already been claimed by another clan."),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("the tag is shown as it will be saved", async ({ page }) => {
    const founder = await createPlayer(page);
    await signIn(page, founder, PASSWORD);

    await page.goto("/clans");
    const form = card(page, "Found a clan");
    await form.getByLabel("Tag").fill("abc");

    // tags are stored upper case, so say so before submitting
    await expect(form.getByText("Shown as [ABC]")).toBeVisible();
  });
});

test.describe("invitations", () => {
  test("an invited player can accept and join", async ({ page }) => {
    const owner = await createPlayer(page);
    const invitee = await createPlayer(page);

    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);

    const invite = card(page, "Invite a player");
    await invite.getByLabel("Username").fill(invitee);
    await invite.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(`${invitee} was invited.`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(invite.getByText(invitee)).toBeVisible();

    await signOut(page);
    await signIn(page, invitee, PASSWORD);
    await page.goto("/clans");

    await expect(page.getByRole("heading", { name: /Clan invites \(1\)/ })).toBeVisible();
    await expect(page.getByText(`From ${owner}`)).toBeVisible();

    await page.getByRole("button", { name: "Accept" }).click();
    await page.waitForURL(new RegExp(clanUrl.replace(/^.*\/clans/, "/clans")), {
      timeout: 20_000,
    });

    // now a member: can leave, but nothing else
    await expect(page.getByRole("button", { name: "Leave clan" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);
  });

  test("an invite can be declined", async ({ page }) => {
    const owner = await createPlayer(page);
    const invitee = await createPlayer(page);

    await signIn(page, owner, PASSWORD);
    await foundClan(page);
    const invite = card(page, "Invite a player");
    await invite.getByLabel("Username").fill(invitee);
    await invite.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(`${invitee} was invited.`)).toBeVisible({
      timeout: 15_000,
    });

    await signOut(page);
    await signIn(page, invitee, PASSWORD);
    await page.goto("/clans");
    await page.getByRole("button", { name: "Decline" }).click();

    await expect(page.getByRole("heading", { name: /Clan invites/ })).toHaveCount(0, {
      timeout: 15_000,
    });
    // still free to found their own
    await expect(page.getByRole("button", { name: "Create clan" })).toBeVisible();
  });

  test("an invite can be withdrawn before it is answered", async ({ page }) => {
    const owner = await createPlayer(page);
    const invitee = await createPlayer(page);

    await signIn(page, owner, PASSWORD);
    await foundClan(page);
    const invite = card(page, "Invite a player");
    await invite.getByLabel("Username").fill(invitee);
    await invite.getByRole("button", { name: "Send invite" }).click();
    await expect(page.getByText(`${invitee} was invited.`)).toBeVisible({
      timeout: 15_000,
    });

    await invite.getByRole("button", { name: "Withdraw" }).click();
    await expect(
      page.getByText(`The invite to ${invitee} was withdrawn.`),
    ).toBeVisible({ timeout: 15_000 });

    await signOut(page);
    await signIn(page, invitee, PASSWORD);
    await page.goto("/clans");
    await expect(page.getByRole("heading", { name: /Clan invites/ })).toHaveCount(0);
  });

  test("inviting an unknown player says so", async ({ page }) => {
    const owner = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    await foundClan(page);

    const invite = card(page, "Invite a player");
    await invite.getByLabel("Username").fill("nobody-by-this-name");
    await invite.getByRole("button", { name: "Send invite" }).click();

    await expect(page.getByText("Could not find a player by that name.")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("a player already in a clan cannot be invited", async ({ page }) => {
    const firstOwner = await createPlayer(page);
    const member = await createPlayer(page);
    await signIn(page, firstOwner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, firstOwner, member);
    await signOut(page);

    const secondOwner = await createPlayer(page);
    await signIn(page, secondOwner, PASSWORD);
    await foundClan(page);

    const invite = card(page, "Invite a player");
    await invite.getByLabel("Username").fill(member);
    await invite.getByRole("button", { name: "Send invite" }).click();

    await expect(page.getByText("They're already in a clan.")).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("ranks and removal", () => {
  test("the owner can promote and demote", async ({ page }) => {
    const owner = await createPlayer(page);
    const member = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, owner, member);

    const row = memberRow(page, member);
    await row.getByRole("button", { name: "Promote" }).click();
    await expect(page.getByText(`${member} is now an officer.`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(memberRow(page, member).getByText("Officer")).toBeVisible();

    await memberRow(page, member).getByRole("button", { name: "Demote" }).click();
    await expect(page.getByText(`${member} is now a member.`)).toBeVisible({
      timeout: 15_000,
    });
    await expect(memberRow(page, member).getByText("Member")).toBeVisible();
  });

  test("an officer can invite but cannot rename or promote", async ({ page }) => {
    const owner = await createPlayer(page);
    const officer = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, owner, officer);

    await memberRow(page, officer).getByRole("button", { name: "Promote" }).click();
    await expect(page.getByText(`${officer} is now an officer.`)).toBeVisible({
      timeout: 15_000,
    });

    await signOut(page);
    await signIn(page, officer, PASSWORD);
    await page.goto(clanUrl);

    // officers invite and remove members
    await expect(page.getByRole("button", { name: "Send invite" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Leave clan" })).toBeVisible();
    // but the clan is not theirs to rename, re-rank or disband
    await expect(page.getByRole("heading", { name: "Name and tag" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Disband clan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Promote" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Make owner" })).toHaveCount(0);
  });

  test("an officer cannot remove a peer", async ({ page }) => {
    const owner = await createPlayer(page);
    const officer = await createPlayer(page);
    const peer = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, owner, officer);
    await inviteAndAccept(page, clanUrl, owner, peer);

    for (const target of [officer, peer]) {
      await memberRow(page, target).getByRole("button", { name: "Promote" }).click();
      await expect(page.getByText(`${target} is now an officer.`)).toBeVisible({
        timeout: 15_000,
      });
    }

    await signOut(page);
    await signIn(page, officer, PASSWORD);
    await page.goto(clanUrl);

    // the peer outranks nobody, but is not below them either
    await expect(memberRow(page, peer).getByRole("button", { name: "Remove" })).toHaveCount(
      0,
    );
  });

  test("the owner can remove a member", async ({ page }) => {
    const owner = await createPlayer(page);
    const member = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, owner, member);

    await memberRow(page, member).getByRole("button", { name: "Remove" }).click();
    await expect(
      page.getByText(`${member} was removed from the clan.`),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto(clanUrl);
    await expect(page.getByRole("link", { name: member })).toHaveCount(0);
  });

  test("a member can leave on their own", async ({ page }) => {
    const owner = await createPlayer(page);
    const member = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, owner, member);

    await signOut(page);
    await signIn(page, member, PASSWORD);
    await page.goto(clanUrl);

    await page.getByRole("button", { name: "Leave clan" }).click();
    await page.getByRole("button", { name: "Yes, leave" }).click();
    await page.waitForURL(/\/clans$/, { timeout: 20_000 });

    // and can found their own again
    await expect(page.getByRole("button", { name: "Create clan" })).toBeVisible();
  });
});

test.describe("ownership and disbanding", () => {
  test("ownership can be transferred, leaving the founder an officer", async ({
    page,
  }) => {
    const owner = await createPlayer(page);
    const heir = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, owner, heir);

    await memberRow(page, heir).getByRole("button", { name: "Make owner" }).click();
    await page.getByRole("button", { name: "Transfer ownership" }).click();
    await expect(page.getByText(`${heir} now owns the clan.`)).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(clanUrl);
    // the founder is now an officer: no rename, no disband, but can leave
    await expect(page.getByRole("heading", { name: "Name and tag" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Disband clan" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Leave clan" })).toBeVisible();
    await expect(memberRow(page, heir).getByText("Owner")).toBeVisible();
  });

  test("the owner can rename and re-tag", async ({ page }) => {
    const owner = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);

    const renamed = uniqueName().slice(0, 12);
    const settings = card(page, "Name and tag");
    await settings.getByLabel("Name").fill(renamed);
    await settings.getByLabel("Tag").fill(uniqueTag());
    await settings.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Clan updated.")).toBeVisible({ timeout: 15_000 });

    await page.goto(clanUrl);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  });

  test("the owner can disband, freeing every member", async ({ page }) => {
    const owner = await createPlayer(page);
    const member = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await inviteAndAccept(page, clanUrl, owner, member);

    await page.getByRole("button", { name: "Disband clan" }).click();
    await page.getByRole("button", { name: "Yes, disband" }).click();
    await page.waitForURL(/\/clans$/, { timeout: 20_000 });

    // the clan is gone
    const response = await page.goto(clanUrl);
    expect(response?.status()).toBe(404);

    // and its members are free again
    await signOut(page);
    await signIn(page, member, PASSWORD);
    await page.goto("/clans");
    await expect(page.getByRole("button", { name: "Create clan" })).toBeVisible();
  });

  test("server staff can disband a clan they are not in", async ({ page }) => {
    const owner = await createPlayer(page);
    await signIn(page, owner, PASSWORD);
    const clanUrl = await foundClan(page);
    await signOut(page);

    await signIn(page, STAFF.username, STAFF.password);
    await page.goto(clanUrl);

    // staff get the disband control without being a member
    await expect(page.getByRole("heading", { name: "Server staff" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send invite" })).toHaveCount(0);

    await page.getByRole("button", { name: "Disband clan" }).click();
    await page.getByRole("button", { name: "Yes, disband" }).click();
    await page.waitForURL(/\/clans$/, { timeout: 20_000 });

    const response = await page.goto(clanUrl);
    expect(response?.status()).toBe(404);
  });
});
