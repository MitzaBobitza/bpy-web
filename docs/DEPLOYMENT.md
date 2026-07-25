# Setting up bpy-web with bancho.py

Ubuntu server, nginx and Cloudflare. Follow it in order and you will have a
working osu! server with this frontend in front of it.

This assumes bancho.py is run **the default way, with Docker**, as its wiki
describes. A bare-metal alternative is in [section 4b](#4b-banchopy-without-docker).

Replace `example.com` with your domain everywhere, and `deploy` with your
username.

**What you need:** a domain on Cloudflare, an Ubuntu 22.04+ server, and an
[osu! API key](https://osu.ppy.sh/home/account/edit) (bancho.py needs it to
fetch beatmap data).

---

## 1. DNS on Cloudflare

In your Cloudflare dashboard, under **DNS → Records**, add these. All of them
are `A` records pointing at your server's IP.

| Name | Purpose |
|---|---|
| `example.com` | the website |
| `www` | redirect to the website |
| `c` | bancho (game login and chat) |
| `ce` | bancho, older clients |
| `c4` | bancho, older clients |
| `osu` | score submission, `/web` endpoints |
| `b` | beatmap thumbnails |
| `a` | avatars |
| `api` | bancho.py's API |
| `assets` | achievement images |

Set the **proxy status** as follows:

- **Proxied (orange cloud):** `example.com`, `www`, `a`, `assets`, `api`
- **DNS only (grey cloud):** `c`, `ce`, `c4`, `osu`, `b`

> The osu! client does not tolerate Cloudflare's proxy on its game endpoints.
> Leaving `c`, `ce`, `c4`, `osu` and `b` unproxied is what makes logging in work.

Then, under **SSL/TLS → Overview**, set the encryption mode to **Full (strict)**.

---

## 2. Server packages

```bash
sudo apt update
sudo apt install -y nginx git curl certbot python3-certbot-nginx

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"     # log out and back in for this to apply

# Node.js 22, for the frontend
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

MySQL and Redis come from Docker, so nothing to install for them.

---

## 3. Get bancho.py

```bash
cd ~
git clone https://github.com/osuAkatsuki/bancho.py.git
cd bancho.py
cp .env.example .env
cp logging.yaml.example logging.yaml
nano .env
```

`logging.yaml` is required — bancho.py will not start without it.

---

## 4. bancho.py with Docker

### 4.1 Configure `.env`

```ini
# must be 0.0.0.0: Docker publishes the container's port, and binding to
# 127.0.0.1 inside the container would make it unreachable from the host
APP_HOST=0.0.0.0
APP_PORT=10000

DOMAIN=example.com

# these are compose service names, not localhost — MySQL and Redis run as
# their own containers on the compose network
DB_HOST=mysql
DB_PORT=3306
DB_USER=bancho
DB_PASS=pick-a-strong-password
DB_NAME=banchopy

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_USER=default
REDIS_PASS=

OSU_API_KEY=your-osu-api-key

# where nginx will look for avatars — see 4.2
DATA_DIRECTORY=/home/deploy/bancho.py/.data

# both sides are behind https, so keep session cookies https-only
WEB_SESSION_COOKIE_SECURE=True

# leave empty to disable the registration captcha, or fill both in
CAPTCHA_PROVIDER=
CAPTCHA_SECRET=
```

You do **not** need to load the database schema by hand. The `mysql` container
runs `migrations/base.sql` automatically the first time it starts.

### 4.2 Make avatars reachable by nginx

bancho.py writes uploads to `.data` *inside* its container, and the shipped
`docker-compose.yml` backs that with a **named Docker volume**. nginx runs on the
host and serves avatars from `${DATA_DIRECTORY}/avatars`, so out of the box the
two point at different places and avatars 404.

Replace the named volume with a real directory. Compose merges
`docker-compose.override.yml` automatically, so no tracked file is modified and
no extra flags are needed:

```bash
nano docker-compose.override.yml
```

```yaml
services:
  bancho:
    ports:
      # only nginx and the frontend talk to this, and both are on this host,
      # so keep it off the public interfaces
      - "127.0.0.1:${APP_PORT}:${APP_PORT}"
    volumes:
      # a real directory, so nginx can read avatars, replays and screenshots
      - ./.data:/srv/root/.data
```

```bash
# create it yourself first: Docker would otherwise create it as root, which
# leaves you unable to list it without sudo
mkdir -p .data
```

Confirm the override took effect — the `.data` line should show your host path,
not a volume name:

```bash
docker compose config | grep -A3 'source.*data'
```

If it still shows the named volume, your Compose version is not merging volume
entries by target path; edit `docker-compose.yml` directly instead, replacing
`data:/srv/root/.data` with `./.data:/srv/root/.data`.

> Without the `ports` override, the shipped compose file publishes port 10000 on
> **every** interface, leaving bancho.py's API open to the internet. Overriding
> it, or firewalling the port, is worth doing.

### 4.3 Start it

```bash
make build
make run-bg
docker compose logs -f bancho
```

> `make build` builds the image locally, which is what the shipped compose file
> expects (`image: bancho:latest`). To use the prebuilt
> `ghcr.io/osuakatsuki/bancho.py:latest` instead, set that as `image:` in your
> `docker-compose.override.yml` and skip `make build`.

The first start downloads achievement images, so give it a minute. Then check it
is answering:

```bash
curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/server/stats
```

You should see `{"status":"success","data":{"online_players":0,...}}`.

If you get `{"detail":"Not Found"}`, the `Host` header does not match — bancho.py
routes its entire API on `api.{DOMAIN}` and 404s anything else.

Then skip to [section 5](#5-bpy-web).

---

## 4b. bancho.py without Docker

Only if you would rather not use Docker. Otherwise skip this.

```bash
sudo apt install -y mariadb-server redis-server
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```bash
sudo mysql
```

```sql
CREATE DATABASE banchopy CHARACTER SET utf8mb4;
CREATE USER 'bancho'@'localhost' IDENTIFIED BY 'pick-a-strong-password';
GRANT ALL PRIVILEGES ON banchopy.* TO 'bancho'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
cd ~/bancho.py
sudo mysql banchopy < migrations/base.sql
uv sync --no-install-project
```

Use the same `.env` as in 4.1, with these differences — there is no compose
network, so everything is local:

```ini
APP_HOST=127.0.0.1
DB_HOST=127.0.0.1
REDIS_HOST=127.0.0.1
```

`.data` is then a plain directory in the repo already, so the override in 4.2
does not apply.

```bash
sudo nano /etc/systemd/system/bancho.service
```

```ini
[Unit]
Description=bancho.py
After=network.target mariadb.service redis-server.service

[Service]
User=deploy
WorkingDirectory=/home/deploy/bancho.py
ExecStart=/home/deploy/bancho.py/.venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bancho
curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/server/stats
```

---

## 5. bpy-web

The frontend only speaks HTTP to bancho.py, so it does not care whether the
backend is in Docker or not. Running it on the host with systemd is the simplest
arrangement; there is a Docker option in [section 5b](#5b-bpy-web-in-docker).

```bash
cd ~
git clone https://github.com/MitzaBobitza/bpy-web.git
cd bpy-web
npm ci

cp .env.example .env.production
nano .env.production
```

```ini
BANCHO_API_URL=http://127.0.0.1:10000
BANCHO_API_HOST=api.example.com

NEXT_PUBLIC_SERVER_NAME=Your Server Name
NEXT_PUBLIC_DOMAIN=example.com
NEXT_PUBLIC_AVATAR_URL=https://a.example.com
NEXT_PUBLIC_BEATMAP_MIRROR_URL=https://catboy.best/d
NEXT_PUBLIC_DISCORD_INVITE=

NEXT_PUBLIC_CAPTCHA_PROVIDER=
NEXT_PUBLIC_CAPTCHA_SITEKEY=
```

> `BANCHO_API_HOST` must be `api.` plus bancho.py's `DOMAIN`, or every request
> 404s.
>
> `NEXT_PUBLIC_*` values are baked in at build time, so rebuild after changing
> them.

Build and run it as a service:

```bash
npm run build
sudo nano /etc/systemd/system/bpy-web.service
```

```ini
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
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bpy-web
curl -I http://127.0.0.1:3000
```

Then go to [section 6](#6-nginx).

---

## 5b. bpy-web in Docker

If you would rather have the whole stack in containers, the repository includes a
`Dockerfile`. Put the frontend on bancho.py's compose network and address the
backend by its service name, which avoids publishing the backend port at all.

Find the network bancho.py created:

```bash
docker network ls | grep -i bancho     # e.g. banchopy_default
```

Then, in the `bpy-web` directory:

```bash
nano docker-compose.yml
```

```yaml
services:
  web:
    build:
      context: .
      args:
        # NEXT_PUBLIC_* must be present at build time
        NEXT_PUBLIC_SERVER_NAME: Your Server Name
        NEXT_PUBLIC_DOMAIN: example.com
        NEXT_PUBLIC_AVATAR_URL: https://a.example.com
        NEXT_PUBLIC_BEATMAP_MIRROR_URL: https://catboy.best/d
    environment:
      # reached over the compose network by service name
      BANCHO_API_URL: http://bancho:10000
      BANCHO_API_HOST: api.example.com
    ports:
      - "127.0.0.1:3000:3000"
    restart: unless-stopped
    networks: [bancho]

networks:
  bancho:
    external: true
    name: banchopy_default   # whatever `docker network ls` showed
```

```bash
docker compose up -d --build
curl -I http://127.0.0.1:3000
```

nginx then proxies to `127.0.0.1:3000` exactly as in section 6.

---

## 6. nginx

> bancho.py ships `scripts/install-nginx-config.sh`, which writes its own
> config from `ext/nginx.conf.example`. **Do not run it** — that config knows
> nothing about the frontend, and the two would fight over
> `example.com`. The config below covers both.

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/osu
```

Paste this, replacing `example.com` and `deploy`:

```nginx
upstream bancho {
    server 127.0.0.1:10000;
}

upstream web {
    server 127.0.0.1:3000;
}

# rate limits on the endpoints worth protecting
limit_req_zone $binary_remote_addr zone=registrations:10m rate=1r/m;
limit_req_zone $binary_remote_addr zone=logins:10m rate=10r/m;

# ── the game server ──────────────────────────────────────────────────────
server {
    listen 80;
    listen 443 ssl;
    http2 on;
    server_name c.example.com ce.example.com c4.example.com
                osu.example.com b.example.com api.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 64M;

    location / {
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
        proxy_pass http://bancho;
    }
}

# ── avatars ──────────────────────────────────────────────────────────────
# this path must be the DATA_DIRECTORY from bancho.py's .env, and with Docker
# it only exists on the host because of the bind mount added in 4.2
server {
    listen 443 ssl;
    http2 on;
    server_name a.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        root /home/deploy/bancho.py/.data/avatars;
        # a request for /123 finds 123.png, 123.jpg, … or falls back
        try_files $uri $uri.png $uri.jpg $uri.jpeg $uri.gif $uri.jfif /default.jpg =404;
        expires 7d;
        add_header Cache-Control "public";
    }
}

# ── achievement images ───────────────────────────────────────────────────
server {
    listen 443 ssl;
    http2 on;
    server_name assets.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        root /home/deploy/bancho.py/.data/assets;
        default_type image/png;
        expires 7d;
    }
}

# ── the website ──────────────────────────────────────────────────────────
server {
    listen 80;
    listen 443 ssl;
    http2 on;
    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # avatar uploads go through the website
    client_max_body_size 8M;

    location = /bancho/v2/accounts {
        limit_req zone=registrations burst=3 nodelay;
        limit_req_status 429;
        include /etc/nginx/snippets/bpy-web-proxy.conf;
    }

    location = /bancho/v2/sessions {
        limit_req zone=logins burst=5 nodelay;
        limit_req_status 429;
        include /etc/nginx/snippets/bpy-web-proxy.conf;
    }

    location / {
        include /etc/nginx/snippets/bpy-web-proxy.conf;
    }
}
```

The shared proxy settings:

```bash
sudo mkdir -p /etc/nginx/snippets
sudo nano /etc/nginx/snippets/bpy-web-proxy.conf
```

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_redirect off;
proxy_pass http://web;
```

> `X-Forwarded-Proto` matters: it is how the app knows the visitor arrived over
> https and keeps the `Secure` flag on the session cookie.

Let nginx into the data directory, then enable the site and get certificates:

```bash
# nginx runs as www-data and must be able to traverse into your home directory
chmod o+x /home/deploy

sudo ln -s /etc/nginx/sites-available/osu /etc/nginx/sites-enabled/osu

sudo certbot certonly --nginx -d example.com -d www.example.com \
  -d c.example.com -d ce.example.com -d c4.example.com \
  -d osu.example.com -d b.example.com -d api.example.com \
  -d a.example.com -d assets.example.com

sudo nginx -t && sudo systemctl reload nginx
```

Certbot renews automatically. Make sure the reload happens after renewal:

```bash
echo -e '#!/bin/sh\nsystemctl reload nginx' \
  | sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx.sh
```

---

## 7. Check it works

```bash
# the website
curl -I https://example.com

# the API, through nginx
curl https://api.example.com/v2/server/stats

# an avatar (404 until someone uploads one, which is fine)
curl -I https://a.example.com/3
```

Then in a browser:

1. Open `https://example.com` — the home page should show your server's counters.
2. Create an account.
3. Sign in, open **Settings**, upload an avatar and save a profile change.
4. Reload your profile — the avatar should appear. If it does not, the bind mount
   from 4.2 is missing.
5. Open `https://example.com/rankings` — empty until scores are submitted.

Finally, connect the game. On Windows, run an osu! server switcher as
administrator and enter `example.com`, or launch the client with
`osu!.exe -devserver example.com`. Log in with the account you just made; your
first score will appear on the site.

---

## 8. Updating

The frontend:

```bash
cd ~/bpy-web
git pull
npm ci
npm run build
sudo systemctl restart bpy-web
```

bancho.py:

```bash
cd ~/bancho.py
git pull
make build
make run-bg
```

---

## If something is wrong

**The website loads but has no data.** The frontend cannot reach bancho.py.

```bash
cd ~/bancho.py && docker compose ps     # Docker
sudo systemctl status bancho            # bare metal

curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/server/stats
```

If that curl works but the site is still empty, `BANCHO_API_URL` or
`BANCHO_API_HOST` is wrong in `.env.production`.

If the curl returns `{"detail":"Not Found"}`, `BANCHO_API_HOST` does not match
bancho.py's `DOMAIN`.

If the curl cannot connect at all and you are using Docker, check `APP_HOST=0.0.0.0`
in bancho.py's `.env` — with `127.0.0.1` the app only listens inside the
container and the published port goes nowhere.

**Registration fails with a server error.** bancho.py needs the forwarded-IP
headers. Check that your nginx site sets both `X-Real-IP` and `X-Forwarded-For`.

**Sign-in appears to work but you are immediately signed out.** The session
cookie is being dropped. Confirm the site is served over https and that nginx
passes `X-Forwarded-Proto`.

**The osu! client cannot log in.** `c`, `ce`, `c4`, `osu` and `b` must be
**DNS only** in Cloudflare, not proxied.

**Avatars 404.** With Docker, this is almost always the missing bind mount from
4.2 — bancho.py is writing into a named volume that nginx cannot see. Confirm
uploads land on the host:

```bash
ls ~/bancho.py/.data/avatars
```

If that directory is empty after an upload, add the override and restart:

```bash
cd ~/bancho.py
docker compose down

# copy anything already uploaded out of the old volume. The volume name is
# derived from the directory name, so check it first:
docker volume ls | grep data          # e.g. banchopy_data
docker run --rm -v banchopy_data:/from -v ~/bancho.py/.data:/to alpine \
  sh -c 'cp -a /from/. /to/'

make run-bg
```

Then check nginx can read the path:

```bash
sudo -u www-data ls /home/deploy/bancho.py/.data/avatars
```

If it cannot, `chmod o+x /home/deploy`.

**Logs.**

```bash
sudo journalctl -u bpy-web -f
cd ~/bancho.py && docker compose logs -f bancho
```
