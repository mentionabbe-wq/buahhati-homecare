# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# BuahHati Home Care — image produksi (Next.js + Prisma + PostgreSQL)
# Build: docker build -t buahhati-homecare .
# ---------------------------------------------------------------------------

FROM node:22-alpine AS base
WORKDIR /app
# openssl dibutuhkan Prisma query engine di Alpine
RUN apk add --no-cache openssl libc6-compat
ENV NEXT_TELEMETRY_DISABLED=1

# --------------------------- dependencies ----------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ------------------------------ builder ------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Image selalu memakai PostgreSQL. Repo dapat berada dalam mode SQLite
# (demo lokal), jadi provider disetel eksplisit saat build.
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# DATABASE_URL palsu: hanya diperlukan agar `prisma generate` & `next build`
# tidak menolak jalan. Koneksi sebenarnya diberikan saat container dijalankan.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-time-placeholder-secret-value-32ch"

RUN npx prisma generate
RUN npx next build

# Seed dikompilasi ke JavaScript agar runtime tidak perlu tsx
RUN npx tsc prisma/seed.ts \
    --outDir dist-seed \
    --module commonjs \
    --target ES2022 \
    --moduleResolution node \
    --esModuleInterop \
    --skipLibCheck

# ------------------------------- runner ------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
COPY --from=builder /app/prisma ./prisma

# Prisma CLI ikut di dependencies agar container bisa menyiapkan skema saat start.
# DATABASE_URL hanya disetel untuk perintah ini, tidak ikut tersimpan di image,
# supaya nilai sungguhan wajib datang dari environment saat container berjalan.
RUN npm ci --omit=dev --ignore-scripts \
    && DATABASE_URL="postgresql://generate:generate@localhost:5432/generate" npx prisma generate \
    && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist-seed ./dist-seed
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY docker ./docker

RUN chmod +x docker/entrypoint.sh && chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/services || exit 1

ENTRYPOINT ["docker/entrypoint.sh"]
