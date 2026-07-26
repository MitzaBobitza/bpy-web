# bpy-web

A complete frontend for [bancho.py](https://github.com/osuAkatsuki/bancho.py), the
osu! server implementation. Rankings, profiles, beatmap leaderboards, clans,
multiplayer, accounts and settings — in an osu!-flavoured interface.

Built with Next.js (App Router), React and Tailwind CSS. No database of its own:
every page reads from bancho.py's HTTP API.

> **Deploying it?** Follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). It assumes
> bancho.py is already running from its
> [official setup guide](https://github.com/osuAkatsuki/bancho.py/wiki/Setting-up)
> and covers only what the website adds: nginx, DNS, and making avatars
> reachable.

## What it covers

| Area | Pages |
|---|---|
| **Rankings** | Global and per-country boards for all 8 playable modes (vanilla, relax, autopilot), sortable by performance, ranked score, total score, accuracy, play count and play time |
| **Profiles** | Per-mode statistics, global and country ranks, top plays with pp weighting, recent plays, most played beatmaps, grade counts, userpage, badges, clan and play style |
| **Beatmaps** | Browse and filter by status, mode, artist and mapper; per-difficulty pages with leaderboards for every mode, difficulty meters, ratings and downloads |
| **Scores** | Score detail with hit breakdown, mods, timing and replay download |
| **Clans** | Listing with member counts, clan pages with ranked membership, and full clan management — see below |
| **Multiplayer** | Live match list with slots, teams, mods and the current beatmap |
| **Tournaments** | Published mappools, grouped by bracket slot |
| **Accounts** | Registration with optional captcha, sign-in, sign-out, avatar upload, username / country / default mode / userpage editing, password change |
| **Social** | Friends list, add and remove friends, favourite beatmaps |
| **Help** | How to connect, rules, FAQ, terms of service, privacy policy |
| **Link previews** | Generated share images for profiles, beatmaps, scores and clans — see below |
| **Staff area** | Player moderation, privileges, beatmap nominations, mappools, announcements and maintenance — see below |

## How it talks to bancho.py

Requests do **not** go from the browser to bancho.py directly. They pass through
a server-side proxy at `/bancho/*`, for three reasons:

1. **bancho.py ships no CORS middleware**, so a cross-origin request could not
   read the response.
2. **The session cookie is http-only.** Keeping the API first-party is what lets
   that cookie ride along, and keeps the token unreadable from scripts.
3. **The API is only routed on the `api.{DOMAIN}` Host**, which a browser cannot
   set. `fetch` cannot set it either — `Host` is a forbidden header, and undici
   silently drops it — so requests go through Node's http client instead
   (`src/lib/bancho/transport.ts`).

The proxy also forwards `X-Forwarded-For` and `X-Real-IP`, which bancho.py's IP
resolver requires; without them, registration fails.

```
browser ──▶ bpy-web (:3000) ──▶ bancho.py (:10000)
            /bancho/v2/…         Host: api.example.com
                                 X-Forwarded-For, X-Real-IP
```

## Requirements

- Node.js 20 or newer
- A running bancho.py instance

## Local development

```bash
cp .env.example .env.local   # then edit it
npm install
npm run dev
```

Point `BANCHO_API_URL` at your bancho.py and `BANCHO_API_HOST` at
`api.<its DOMAIN>`. The domain does not need to resolve — it is only sent as a
header.

For sign-in to work over plain http, set `WEB_SESSION_COOKIE_SECURE=False` in
bancho.py's `.env`. The proxy also strips `Secure` from cookies on http
requests, so either side is enough.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against a running stack |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run shots` | Screenshot pages for visual review |

## Tests

Unit tests cover the osu! domain logic — mod bitfields, grades, the difficulty
spectrum, privileges, game modes, and number and date formatting.

End-to-end tests run against a **real bancho.py**, not mocks, and cover the
account lifecycle (register, sign in, edit profile, change password, friends,
favourites, sign out), every public page reading live records, hydration on
every route, and horizontal-overflow checks from 360px to 1440px.

```bash
npm run dev                 # in one shell, with bancho.py already running
npm run test:e2e            # in another
```

The staff area and clan suites sign in as an account that already exists and
holds every privilege. Point them at one through the environment — no
credential is kept in the repository, and those suites skip themselves when it
is not set:

```bash
export E2E_STAFF_USERNAME=yourstaffaccount
export E2E_STAFF_PASSWORD=...
npm run test:e2e
```

**Point all of this at a development database, never a live server.** The tests
register throwaway accounts and delete nothing, and the staff suites restrict
players, disband clans and wipe scores.

## Configuration

Every setting is in `.env.example`, with notes. Two are worth calling out:

- **`BANCHO_API_HOST`** must be `api.` plus bancho.py's `DOMAIN`, or every
  request 404s.
- **Captcha** must match on both sides: bancho.py verifies the token with its
  `CAPTCHA_PROVIDER` and `CAPTCHA_SECRET`, and this app renders the widget with
  `NEXT_PUBLIC_CAPTCHA_PROVIDER` and `NEXT_PUBLIC_CAPTCHA_SITEKEY`. Leave all
  four empty to disable it.

## Country flags

Wherever a player appears — rankings, profiles, score rows, clan rosters,
search and the staff area — their country shows as its flag, and as its name
for anyone using a screen reader.

The images are SVGs in `public/flags`, vendored from
[flag-icons](https://github.com/lipis/flag-icons) (MIT, see
`public/flags/LICENSE`) rather than loaded from a CDN, so the site draws them
without reaching an external host. Emoji flags would have been simpler and are
the wrong answer: Windows renders them as bare letters, and that is most of
the audience.

bancho.py stores `xx` when it cannot place a player, and that has no flag by
definition — those fall back to a code chip. A unit test keeps the directory
and the country list in step, so nothing can render as a broken image.

## Link previews

Posting a link in Discord, Slack, Twitter or iMessage unfurls it into a card
drawn from live data, at the 1200×630 those apps expect:

| Link | The card shows |
|---|---|
| A profile | Avatar, country, global rank, pp, accuracy, play count and grade counts |
| A beatmap | The set's cover art, artist, title, difficulty name, star rating in osu!'s colour, BPM, combo and plays |
| A score | Grade on its own plate, player, beatmap, mods, pp, accuracy, combo and misses |
| A clan | Tag, name, the first of the roster with their ranks, and member count |
| Anything else | The server card, with its player counts |

The images are generated per request by `next/og`, so they are always current
and there is nothing to regenerate when a player's rank moves. Nunito is
vendored under `src/lib/og-assets` rather than fetched, so a server that
cannot reach the internet still produces them; a cover or avatar that will not
load is skipped rather than failing the card.

**`NEXT_PUBLIC_SITE_URL` has to be the site's real public address.** Preview
images are referenced by absolute url, and a chat app has no page to resolve a
relative one against. It defaults to `https://` plus `NEXT_PUBLIC_DOMAIN`.

Discord tints an embed's left edge with `theme-color`, which is the server's
pink here rather than the page background — that colour also becomes the
browser chrome on mobile.

## Clans

Clans are run entirely from the site — founding, invitations, ranks, renaming,
transfers and disbanding — with no need to type `!clan` in game. Controls are
gated on clan rank, and the server enforces the same boundaries.

| Rank | What it can do |
|---|---|
| Member | Leave the clan |
| Officer | Everything a member can, plus invite players, withdraw invites and remove ordinary members |
| Owner | Everything an officer can, plus promote and demote, rename and re-tag, transfer and disband |

Restricted players cannot manage a clan from here, the same as `!clan`
refusing them in game.

Server staff get their own controls under **Clans** in the staff area:
renaming a clan whose name breaks the rules, handing one on when its owner is
restricted or gone, removing a member, and dissolving it — so disbanding is
not the only tool available. `!clan disband <tag>` still works and now lands
in the audit log too, alongside every other staff action.

Joining works by invitation: an officer invites by username, and the invite
waits on `/clans` until the player accepts or declines. Accepting one turns
down the rest. There is exactly one owner, so ownership moves by transfer
rather than by promotion, and an owner has to hand the clan on or disband it
before leaving.

Two things follow from bancho.py's server-wide visibility rules, and are worth
knowing:

- **A player who has never logged in to the game cannot be invited.** Web
  registration leaves an account unverified, which hides it everywhere —
  player search included. One in-game login fixes it.
- **A member who is restricted disappears from the roster**, for their
  clanmates as well as the public. Clan rank grants no extra sight, because it
  would otherwise reveal a restriction to everyone in the clan.

Like the staff area, this needs endpoints that are part of
[this fork of bancho.py](https://github.com/MitzaBobitza/bancho.py). Against an
upstream server the clan pages still list clans and members, but the management
controls are absent.

## The staff area

`/admin` is privilege-aware: each section and control appears only for staff who
hold the privilege it needs, and the server enforces the same boundaries, so a
hidden control is unreachable rather than merely invisible. Players without any
staff privilege get a 404 rather than a refusal.

| Section | Privilege | What it covers |
|---|---|---|
| Players | Moderator | Account state, notes, silences, and the moderation history |
| | Administrator | Restrictions, notifications, login history, hardware matches |
| | Developer | Privilege grants and revocations, donator grants |
| Clans | Any staff | Renaming, handing on and dissolving clans |
| Audit log | Moderator | Every staff action, filterable by action and period |
| Beatmaps | Nominator | The nomination queue, and ranked status by map or set |
| Mappools | Tournament staff | Building tournament pools, pick by pick |
| Announcements | Administrator | Notifying everyone, or one connected player |
| Maintenance | Developer | Score wipes |

This needs the `/v2/admin` endpoints, which are part of
[this fork of bancho.py](https://github.com/MitzaBobitza/bancho.py) rather than
upstream. Against an upstream server the rest of the site works normally and the
staff area 404s.

Every action mirrors an in-game chat command and goes through the same code, so
the audit log reads the same whichever surface was used, and privileges behave
identically — they are independent bits with no hierarchy, so a developer
without the administrator bit cannot restrict, exactly as `!restrict` behaves.

A few developer commands are deliberately absent, and the Maintenance page says
so: recalculating pp is a batch job bancho.py ships a script for, shutting the
server down belongs to systemd or Docker, and module reloads, console debug,
stealth mode and forcing a player into a match only mean anything inside the
running game process.

## What bancho.py does not expose

A few things are absent because the API has no endpoint for them, not by choice:

- **No rank history graphs.** Only current ranks are stored, so there is no
  historical series to plot. Profiles chart the pp of a player's top plays
  instead, which is real data.
- **The public tournaments page needs a pool's creator online.** The v1
  endpoint it reads resolves the creator from bancho.py's in-memory session
  list. The staff area does not have this problem — its own endpoint reads
  pools from the database.
- **No server-wide "recent scores" feed.** The global score listing is
  unordered, so the home page draws its latest-plays strip from the players at
  the top of the leaderboard, whose score lists *are* ordered.

## Licence

MIT.
