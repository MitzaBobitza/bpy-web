import { test } from "@playwright/test";

/**
 * The staff account the privileged tests sign in as.
 *
 * Read from the environment rather than written here: this is an account
 * that already exists on the server under test, holding every privilege,
 * and a credential like that does not belong in a repository. The tests
 * that need it are skipped when it is not configured, so the rest of the
 * suite still runs on a checkout with nothing set up.
 *
 * ```bash
 * export E2E_STAFF_USERNAME=yourstaffaccount
 * export E2E_STAFF_PASSWORD=...
 * npm run test:e2e
 * ```
 *
 * Point it at a development server. These tests restrict players, disband
 * clans and wipe scores.
 */
export const STAFF = {
  username: process.env.E2E_STAFF_USERNAME ?? "",
  password: process.env.E2E_STAFF_PASSWORD ?? "",
};

export const hasStaffAccount = Boolean(STAFF.username && STAFF.password);

/** Skip a suite that cannot run without the staff account. */
export function requireStaffAccount(): void {
  test.skip(
    !hasStaffAccount,
    "set E2E_STAFF_USERNAME and E2E_STAFF_PASSWORD to a staff account on the server under test",
  );
}
