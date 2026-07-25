# Setting up bpy-web with bancho.py

Ubuntu server, nginx and Cloudflare. Follow it in order and you will have a
working osu! server with this frontend in front of it.

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
sudo apt install -y nginx git curl certbot python3-certbot-nginx \
  mariadb-server redis-server

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# uv, which bancho.py uses to manage its Python environment
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

## 3. Database

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

---

## 4. bancho.py

```bash
cd ~
git clone https://github.com/osuAkatsuki/bancho.py.git
cd bancho.py

# load the schema
sudo mysql banchopy < migrations/base.sql

# python environment
uv sync --no-install-project

cp .env.example .env
cp logging.yaml.example logging.yaml
nano .env
```

Set these in `.env`:

```ini
APP_HOST=127.0.0.1
APP_PORT=10000

DOMAIN=example.com

DB_USER=bancho
DB_PASS=pick-a-strong-password
DB_NAME=banchopy
DB_HOST=127.0.0.1
DB_PORT=3306

REDIS_USER=default
REDIS_PASS=
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0

OSU_API_KEY=your-osu-api-key
DATA_DIRECTORY=/home/deploy/bancho.py/.data

# both sides are behind https, so keep session cookies https-only
WEB_SESSION_COOKIE_SECURE=True

# leave empty to disable the registration captcha, or fill both in
CAPTCHA_PROVIDER=
CAPTCHA_SECRET=
```

`logging.yaml` is required — bancho.py will not start without it.

Run it as a service:

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
sudo systemctl status bancho
```

The first start downloads achievement images, so give it a minute. Check it is
answering:

```bash
curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/server/stats
```

You should see `{"status":"success","data":{"online_players":0,...}}`.

---

## 5. bpy-web

```bash
cd ~
git clone https://github.com/YOUR-USERNAME/bpy-web.git
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

> `BANCHO_API_HOST` must be `api.` plus bancho.py's `DOMAIN`. bancho.py routes
> its API on that Host header and returns 404 for anything else.
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
After=network.target bancho.service

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

---

## 6. nginx

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

Enable it and get certificates:

```bash
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
4. Open `https://example.com/rankings` — empty until scores are submitted.

Finally, connect the game. On Windows, run an osu! server switcher as
administrator and enter `example.com`, or launch the client with
`osu!.exe -devserver example.com`. Log in with the account you just made; your
first score will appear on the site.

---

## 8. Updating

```bash
cd ~/bpy-web
git pull
npm ci
npm run build
sudo systemctl restart bpy-web
```

---

## If something is wrong

**The website loads but has no data.** The frontend cannot reach bancho.py.

```bash
sudo systemctl status bancho
curl -H "Host: api.example.com" http://127.0.0.1:10000/v2/server/stats
```

If that returns `{"detail":"Not Found"}`, `BANCHO_API_HOST` does not match
bancho.py's `DOMAIN`.

**Registration fails with a server error.** bancho.py needs the forwarded-IP
headers. Check that your nginx site sets both `X-Real-IP` and `X-Forwarded-For`.

**Sign-in appears to work but you are immediately signed out.** The session
cookie is being dropped. Confirm the site is served over https and that nginx
passes `X-Forwarded-Proto`.

**The osu! client cannot log in.** `c`, `ce`, `c4`, `osu` and `b` must be
**DNS only** in Cloudflare, not proxied.

**Avatars 404.** Check the path in the `a.example.com` block matches your
`DATA_DIRECTORY`, and that nginx can read it:

```bash
sudo -u www-data ls /home/deploy/bancho.py/.data/avatars
```

If it cannot, allow traversal into the home directory:

```bash
chmod o+x /home/deploy
```

**Logs.**

```bash
sudo journalctl -u bpy-web -f
sudo journalctl -u bancho -f
```
