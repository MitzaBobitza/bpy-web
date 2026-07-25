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
| **Clans** | Listing with member counts, and clan pages with ranked membership |
| **Multiplayer** | Live match list with slots, teams, mods and the current beatmap |
| **Tournaments** | Published mappools, grouped by bracket slot |
| **Accounts** | Registration with optional captcha, sign-in, sign-out, avatar upload, username / country / default mode / userpage editing, password change |
| **Social** | Friends list, add and remove friends, favourite beatmaps |
| **Help** | How to connect, rules, FAQ, terms of service, privacy policy |
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

The account tests register throwaway accounts and delete nothing, so point them
at a development database rather than a live server.

## Configuration

Every setting is in `.env.example`, with notes. Two are worth calling out:

- **`BANCHO_API_HOST`** must be `api.` plus bancho.py's `DOMAIN`, or every
  request 404s.
- **Captcha** must match on both sides: bancho.py verifies the token with its
  `CAPTCHA_PROVIDER` and `CAPTCHA_SECRET`, and this app renders the widget with
  `NEXT_PUBLIC_CAPTCHA_PROVIDER` and `NEXT_PUBLIC_CAPTCHA_SITEKEY`. Leave all
  four empty to disable it.

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
