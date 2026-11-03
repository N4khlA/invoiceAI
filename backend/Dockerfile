# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Chromium comes from apk in the runner; don't let Puppeteer download its own
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app

# Copy manifests and install ALL deps (including devDeps for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY . .
RUN npx prisma generate --config prisma/config.ts
RUN npm run build

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Install Chromium for Puppeteer PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use the installed Chromium instead of downloading
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

# Production dependencies only (the prisma CLI is one: migrations run on boot)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and the generated Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy --config prisma/config.ts && node dist/index.js"]
