# Build image for bpy-web.
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
# they have to be passed as build arguments rather than at run time. The
# server-side settings (BANCHO_API_URL, BANCHO_API_HOST) are read at startup
# and belong in the environment instead.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SERVER_NAME
ARG NEXT_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_AVATAR_URL
ARG NEXT_PUBLIC_BEATMAP_MIRROR_URL
ARG NEXT_PUBLIC_DISCORD_INVITE
ARG NEXT_PUBLIC_CAPTCHA_PROVIDER
ARG NEXT_PUBLIC_CAPTCHA_SITEKEY

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# the standalone output carries only the server and the modules it needs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER node
EXPOSE 3000

CMD ["node", "server.js"]
