# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests and install ALL deps (including devDeps for tsc)
COPY package*.json ./
RUN npm ci

# Copy source and compile
COPY . .
RUN npx prisma generate
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
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3001

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
