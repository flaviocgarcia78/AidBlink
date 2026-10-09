# syntax=docker/dockerfile:1

# AidBlink — multi-stage image.
#
# IMPORTANT: every NEXT_PUBLIC_* value is inlined into the client bundle at
# build time (not read at runtime), so it is passed here as a build argument.
# Server-only secrets (the voucher HMAC secret and the anchor keypair) are
# injected at runtime, never baked into the image.

# ------------------------------ dependencies ------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# -------------------------------- builder ---------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_SOLANA_NETWORK=devnet
ARG NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
ARG NEXT_PUBLIC_TREASURY_ADDRESS=
ARG NEXT_PUBLIC_SOL_USD_RATE=150

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_SOLANA_NETWORK=$NEXT_PUBLIC_SOLANA_NETWORK \
    NEXT_PUBLIC_SOLANA_RPC_URL=$NEXT_PUBLIC_SOLANA_RPC_URL \
    NEXT_PUBLIC_TREASURY_ADDRESS=$NEXT_PUBLIC_TREASURY_ADDRESS \
    NEXT_PUBLIC_SOL_USD_RATE=$NEXT_PUBLIC_SOL_USD_RATE

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --------------------------------- runner ---------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# The standalone server plus static assets and public files.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Defense in depth: never ship local env files or demo state. Secrets are
# injected at runtime and state lives on the mounted volume.
RUN rm -rf /app/.env /app/.env.* /app/.data \
 && mkdir -p /app/.data \
 && chown -R nextjs:nodejs /app/.data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
