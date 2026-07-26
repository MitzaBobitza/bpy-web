# Deploying bpy-web

This adds the website to a **bancho.py server that is already running**, set up
with the [official guide](https://github.com/osuAkatsuki/bancho.py/wiki/Setting-up)
— Docker for the app, nginx installed via `./scripts/install-nginx-config.sh`.

> **For the staff area and clan management**, run
> [this fork of bancho.py](https://github.com/MitzaBobitza/bancho.py) in place of
> upstream. It adds the `/v2/admin` and `/v2/clans` endpoints those need and is
> otherwise the same server, so every step below is unchanged. Against upstream
> the site still works — `/admin` returns 404 and the clan pages list clans
> without the management controls. **Already running upstream? See
> [step 0](#0-optional-switch-an-existing-server-to-the-fork).**

Nothing here changes how bancho.py itself is installed or run. It leaves
`bancho.conf` untouched, so re-running `install-nginx-config.sh` later will not
undo any of it.

Replace `example.com` with your domain and `deploy` with your username.

---

## 0. Optional: switch an existing server to the fork

Skip this if you are happy without the staff area and clan management, or if
you are installing bancho.py fresh — in that case just clone the fork instead
of upstream.

The fork sits directly on top of upstream's `master` with no divergence, so
this is a fast-forward, not a merge. It adds one table and changes no existing
one.

**Back the database up first.** This is the only step that touches player data,
and you want the file whether or not anything goes wrong:

```bash
cd ~/bancho.py
set -a; . ./.env; set +a          # DB_USER, DB_PASS and DB_NAME come from here

docker compose exec -T mysql \
  mysqldump -u"$DB_USER" -p"$DB_PASS" --single-transaction "$DB_NAME" \
  > ~/banchopy-$(date +%F).sql

ls -lh ~/banchopy-*.sql           # confirm it is not empty
tail -1 ~/banchopy-*.sql          # should end with "Dump completed"
```

> The compose file gives MySQL a random root password, so use `DB_USER` — root
> is not something you can log in as.

Note which version you are on — the migration runner replays everything between
that and the fork's `5.3.1`:

```bash
docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SELECT ver_major, ver_minor, ver_micro, datetime FROM startups ORDER BY datetime DESC LIMIT 1"
```

Then point the checkout at the fork and rebuild:

```bash
cd ~/bancho.py
git remote add fork https://github.com/MitzaBobitza/bancho.py.git
git fetch fork
git status --short                 # must be empty; commit or stash local edits
git merge --ff-only fork/master    # refuses rather than merging if you diverged

docker compose build bancho
docker compose up -d
docker compose logs -f bancho      # watch for "Updating mysql structure"
```

Your `.env`, `.data` and database are untouched by this — only the code
changes.

> **Not running under Docker?** Same git steps, then refresh dependencies with
> `uv sync --no-install-project` and restart however you run it
> (`sudo systemctl restart bancho`). The migration runs at startup either way.
> Drop the `docker compose exec -T mysql` prefix from the database commands
> here and run `mysql` directly.

Confirm the migration landed and the new endpoints answer:

```bash
docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SHOW TABLES LIKE 'clan_invites'"

curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/clans
```

`clan_invites` should be listed, and the clans call should return a success
envelope rather than `{"detail":"Not Found"}`.

**If you need to go back**, `git merge --ff-only` means upstream is still in
your history:

```bash
cd ~/bancho.py
git checkout <the commit you noted from git log before merging>
docker compose build bancho && docker compose up -d
```

The `clan_invites` table stays behind unused, which is harmless, and the
migration is written so that coming forward to the fork again re-applies
cleanly.

> **Give yourself the staff privileges** once you are on the fork, if you do
> not already have them. From the server, in the bancho.py directory:
>
> ```bash
> docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
>   -e "UPDATE users SET priv = priv | 31744 WHERE name = 'YourName'"
> ```
>
> That adds tournament manager, nominator, moderator, administrator and
> developer at once. Privileges are independent bits with no hierarchy, which
> is why they are set together. Sign out and back in on the website afterwards.

---

## 1. Collect what you need

Everything comes from bancho.py's own `.env`:

```bash
cd ~/bancho.py
grep -E '^(DOMAIN|APP_PORT|DATA_DIRECTORY|SSL_CERT_PATH|SSL_KEY_PATH)=' .env
```

| Value | Used for |
|---|---|
| `DOMAIN` | the website's hostname, and the `api.` host the frontend must send |
| `APP_PORT` | where the frontend reaches bancho.py (10000 by default) |
| `DATA_DIRECTORY` | where nginx serves avatars from |
| `SSL_CERT_PATH`, `SSL_KEY_PATH` | the certificate `bancho.conf` already uses |

Confirm bancho.py is answering on its API host:

```bash
curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/server/stats
```

You want `{"status":"success","data":{"online_players":0,...}}`. If you get
`{"detail":"Not Found"}`, the `Host` header does not match your `DOMAIN` —
bancho.py routes its entire API on `api.{DOMAIN}` and 404s anything else.

> **Your database must run in UTC.** bancho.py stores score and audit
> timestamps as naive datetimes in whatever timezone the database is set to,
> and the website reads them as UTC. The official setup is already correct —
> the `mysql` container defaults to UTC — but if you run your own MySQL, check
> it:
>
> ```bash
> mysql -e "SELECT NOW(), UTC_TIMESTAMP()"
> ```
>
> If those differ, every time shown on the site will be off by that much.
> Start MySQL with `--default-time-zone=+00:00`.

---

## 2. DNS

The official guide does not cover DNS, so here is the whole set. Every record
is an `A` record pointing at your server's IPv4 address; add the matching
`AAAA` records too if you serve IPv6.

The last two are what the website adds — the rest are bancho.py's, taken from
the `server_name` lines in its own `ext/nginx.conf.example`.

| Name | Serves | Cloudflare proxy |
|---|---|---|
| `c` | bancho: login, chat, presence | **DNS only** |
| `ce` | bancho | **DNS only** |
| `c4` | bancho | **DNS only** |
| `osu` | score submission, leaderboards, osu!direct, replays | **DNS only** |
| `b` | beatmap thumbnails the client fetches | **DNS only** |
| `a` | avatars | **DNS only** |
| `assets` | static assets | **DNS only** |
| `api` | bancho.py's API | **DNS only** |
| `@` (the root) | the website | **Proxied** |
| `www` | the website | **Proxied** |

**The game subdomains must stay DNS only (grey cloud).** The osu! client will
not complete a login through Cloudflare's proxy. That is certain for `c`,
`ce`, `c4` and `osu`; `a`, `b` and `assets` are only static files and would
probably survive being proxied, but the client fetches them too and there is
nothing to gain by finding out.

`api` is a special case: the website never resolves it. It reaches bancho.py
over localhost and sets the `Host` header itself, so this record only matters
if something outside your server uses the API. Leave it DNS only, or leave it
out entirely.

Proxying the root and `www` is what you want — Cloudflare's caching and DDoS
protection in front of the website, and nothing the game client touches.

Under **SSL/TLS → Overview**, the mode must be **Full (strict)**. Your origin
certificate has to cover every name above; a Cloudflare Origin Certificate
for `example.com` and `*.example.com` covers all of them at once.

If you turn on **Bot Fight Mode** (Security → Bots), leave it off for the
website, or link previews stop working: Discord, Slack and the rest fetch
pages with their own crawler, and a challenge page has no preview in it.

---

## 3. Install the frontend

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

cd ~
git clone https://github.com/MitzaBobitza/bpy-web.git
cd bpy-web
npm ci

cp .env.example .env.production
nano .env.production
```

Fill it in with the values from step 1:

```ini
# reached server-to-server on localhost; never exposed publicly
BANCHO_API_URL=http://127.0.0.1:10000
# must be "api." plus bancho.py's DOMAIN
BANCHO_API_HOST=api.example.com

NEXT_PUBLIC_SERVER_NAME=Your Server Name
NEXT_PUBLIC_DOMAIN=example.com
# where the site itself is reachable; the preview images Discord and the
# rest show for a shared link are built from this, so it must be the real
# public address
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_AVATAR_URL=https://a.example.com
NEXT_PUBLIC_BEATMAP_MIRROR_URL=https://catboy.best/d
NEXT_PUBLIC_DISCORD_INVITE=

# only if bancho.py has CAPTCHA_PROVIDER and CAPTCHA_SECRET set; the provider
# must match, and this is the site key to its secret
NEXT_PUBLIC_CAPTCHA_PROVIDER=
NEXT_PUBLIC_CAPTCHA_SITEKEY=
```

> `NEXT_PUBLIC_*` values are compiled into the browser bundle, so rebuild after
> changing any of them.

Build it and run it as a service:

```bash
npm run build

sudo tee /etc/systemd/system/bpy-web.service > /dev/null <<'EOF'
[Unit]
Description=bpy-web
After=network.target docker.service

[Service]
User=deploy
WorkingDirectory=/home/deploy/bpy-web
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now bpy-web
curl -I http://127.0.0.1:3000
```

---

## 4. Add the website to nginx

This goes in its own file next to bancho.py's `bancho.conf`. Do not edit
`bancho.conf` — `install-nginx-config.sh` regenerates it.

```bash
sudo nano /etc/nginx/sites-available/bpy-web.conf
```

```nginx
upstream bpy_web {
    server 127.0.0.1:3000;
}

# bancho.conf already rate-limits the API host; the website reaches the same
# endpoints through its own origin, so it needs its own zones. The names must
# differ from bancho.conf's, or nginx will refuse to start.
limit_req_zone $binary_remote_addr zone=web_registrations:10m rate=1r/m;
limit_req_zone $binary_remote_addr zone=web_logins:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=web_avatar_uploads:10m rate=10r/m;

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://example.com$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name example.com www.example.com;

    # the same certificate bancho.conf uses — see step 1
    ssl_certificate     /home/deploy/certs/fullchain.crt;
    ssl_certificate_key /home/deploy/certs/private.key;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH:@SECLEVEL=1";

    # avatar uploads pass through the website
    client_max_body_size 8M;

    location = /bancho/v2/accounts {
        limit_req zone=web_registrations burst=3 nodelay;
        limit_req_status 429;
        include snippets/bpy-web-proxy.conf;
    }

    location = /bancho/v2/sessions {
        limit_req zone=web_logins burst=5 nodelay;
        limit_req_status 429;
        include snippets/bpy-web-proxy.conf;
    }

    location ~ ^/bancho/v2/players/\d+/avatar$ {
        limit_req zone=web_avatar_uploads burst=5 nodelay;
        limit_req_status 429;
        include snippets/bpy-web-proxy.conf;
    }

    location / {
        include snippets/bpy-web-proxy.conf;
    }
}
```

The shared proxy settings:

```bash
sudo nano /etc/nginx/snippets/bpy-web-proxy.conf
```

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_redirect off;
proxy_pass http://bpy_web;
```

> All four headers matter. `X-Real-IP` and `X-Forwarded-For` are what bancho.py's
> IP resolver reads — registration fails outright without them. `X-Forwarded-Proto`
> is how the app knows the visitor arrived over https, which keeps the `Secure`
> flag on the session cookie; without it, sign-in appears to work and then
> immediately drops.

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/bpy-web.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

**If your certificate does not cover the apex domain**, get one before reloading.
The simplest option with Cloudflare is an [Origin Certificate](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
(valid 15 years, works with Full (strict)) — create it in the dashboard, save the
two files, and point `ssl_certificate` / `ssl_certificate_key` at them. With
certbot instead:

```bash
sudo certbot certonly --webroot -w /var/www/html -d example.com -d www.example.com
# then use /etc/letsencrypt/live/example.com/{fullchain,privkey}.pem above
```

---

## 5. Make avatars reachable

bancho.py writes uploads to `.data` **inside its container**, and the compose
file backs that with a named Docker volume. nginx runs on the host and serves
`${DATA_DIRECTORY}/avatars`, so by default the two are different directories and
every avatar 404s.

Check whether that is the case on your machine:

```bash
cd ~/bancho.py
docker compose exec bancho ls .data          # what bancho.py writes to
ls "$(grep '^DATA_DIRECTORY=' .env | cut -d= -f2)"   # what nginx serves
```

If the second is missing or empty while the first has `avatars`, `assets` and so
on, point them at the same place. Compose merges `docker-compose.override.yml`
automatically, so no tracked file changes:

```bash
nano docker-compose.override.yml
```

```yaml
services:
  bancho:
    volumes:
      # a real directory on the host, so nginx can read it
      - ./.data:/srv/root/.data
```

```bash
# create it yourself first, or Docker creates it owned by root
mkdir -p .data

# confirm the override applied — this should print your host path
docker compose config | grep -A3 'source.*data'

# move anything already uploaded out of the old volume
docker volume ls | grep data           # note the name, e.g. banchopy_data
docker compose down
docker run --rm -v banchopy_data:/from -v ~/bancho.py/.data:/to alpine \
  sh -c 'cp -a /from/. /to/'
make run-bg
```

`DATA_DIRECTORY` in `.env` must equal that directory — `/home/deploy/bancho.py/.data`.
Finally, let nginx traverse into your home directory:

```bash
chmod o+x /home/deploy
sudo -u www-data ls "$(grep '^DATA_DIRECTORY=' ~/bancho.py/.env | cut -d= -f2)/avatars"
```

> A missing `default.jpg` is harmless. Players without an avatar fall back to
> their initials on a generated colour, so the site never shows a broken image.

---

## 6. Check it works

```bash
curl -I https://example.com
curl -I https://a.example.com/3        # 404 until someone uploads an avatar
```

Then in a browser, on `https://example.com`:

1. The home page shows your server's player and beatmap counters. If they are
   dashes, the frontend cannot reach bancho.py — see below.
2. Create an account, then sign in.
3. Reload the page. You should still be signed in — this is what proves the
   session cookie is surviving, and therefore that `X-Forwarded-Proto` is set.
4. Open **Settings**, upload an avatar, and save a profile change.
5. Reload your profile. The avatar should appear; if it does not, step 5 above is
   incomplete.
6. **Rankings** and **Beatmaps** stay empty until scores are submitted in game.

---

## 7. Updating

The website:

```bash
cd ~/bpy-web
git pull
npm ci
npm run build
sudo systemctl restart bpy-web
```

The fork of bancho.py, if you are running it:

```bash
cd ~/bancho.py
git pull fork master
docker compose build bancho && docker compose up -d
```

Back the database up first whenever a pull brings a new `# vX.Y.Z` block in
`migrations/migrations.sql` — that is the signal that the schema changes.

---

## If something is wrong

**The home page loads but every counter is a dash.** The frontend cannot reach
bancho.py.

```bash
curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/server/stats
```

- Works → `BANCHO_API_URL` or `BANCHO_API_HOST` is wrong in `.env.production`.
  `BANCHO_API_HOST` must be `api.` plus bancho.py's `DOMAIN`.
- Returns `{"detail":"Not Found"}` → same mismatch, on the `Host` header.
- Cannot connect → bancho.py is down, or `APP_HOST` in its `.env` is not
  `0.0.0.0`. Inside a container, `127.0.0.1` means the published port reaches
  nothing. Check with `cd ~/bancho.py && docker compose ps`.

**Registration returns a server error.** bancho.py's IP resolver needs the
forwarded headers. Confirm `snippets/bpy-web-proxy.conf` sets both `X-Real-IP`
and `X-Forwarded-For`.

**Sign-in succeeds, then you are signed out again.** The session cookie is being
dropped because bancho.py marks it `Secure`. Serve the site over https and make
sure nginx passes `X-Forwarded-Proto $scheme`.

**Registration says the captcha failed.** bancho.py has `CAPTCHA_PROVIDER` set
but the frontend does not, or the site key belongs to a different secret. Either
match them, or clear all four values on both sides to disable it.

**nginx will not start after adding the file.** Almost always a duplicate
`limit_req_zone` name or a second `upstream bancho` clashing with `bancho.conf`.
`sudo nginx -t` names the line.

**Avatars 404.** Step 5.

**The clan or staff pages error, and `clan_invites` does not exist.** The
migration did not run. It exits quietly in three cases, so find out which:

```bash
cd ~/bancho.py
set -a; . ./.env; set +a

# 1. is the running code actually the fork?
docker compose exec -T bancho grep '^version' pyproject.toml     # want 5.3.1

# 2. what does the database think it last ran?
docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SELECT ver_major, ver_minor, ver_micro, datetime FROM startups ORDER BY datetime DESC LIMIT 1"
```

- **Version is 5.3.0** — the image is stale. `docker compose up -d` on its own
  does not rebuild. Run `docker compose build bancho && docker compose up -d`.
- **`startups` already says 5.3.1** — the runner thinks it is done. Apply the
  table by hand, below.
- **`startups` is empty** — on a database with no startup row the runner
  records the version and applies nothing at all. Apply the table by hand.

Applying it by hand is safe — this is the same statement the migration runs:

```bash
docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS clan_invites (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  clan_id    INT NOT NULL,
  user_id    INT NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT clan_invites_clan_id_user_id_uindex UNIQUE (clan_id, user_id),
  KEY clan_invites_user_id_index (user_id)
);
SQL
```

Then confirm, and restart so bancho.py picks the table up:

```bash
docker compose exec -T mysql mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SHOW CREATE TABLE clan_invites\G"
docker compose restart bancho
```

`CREATE TABLE IF NOT EXISTS` means running this when the table already exists
does nothing, and leaves the migration free to run normally later.

**Logs.**

```bash
sudo journalctl -u bpy-web -f
cd ~/bancho.py && docker compose logs -f bancho
```
