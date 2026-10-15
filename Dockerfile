# syntax=docker/dockerfile:1
#
# On-prem / VPS deployment of the Next.js Node server plus Chromium for PDF rendering.
#
# Chromium is the reason this is a Docker deployment rather than a serverless one: the image
# carries a real browser (~450 MB installed) and needs memory and /dev/shm. In exchange,
# Thai text is shaped by the browser's own text stack, which is the whole point of the
# PDF engine decision (see docs/operations.md).

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Chromium is installed in the runner stage, so puppeteer's own download is skipped here.
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:24-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# No Supabase credentials are needed to build: every data access happens at request time.
RUN npm run build

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM node:24-slim AS runner
WORKDIR /app

# chromium      — the PDF renderer
# fonts-noto-*  — a fallback if a document references a glyph outside the bundled Thai font
# tini          — PID 1 so SIGTERM reaches Node and Chromium shuts down cleanly
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        fonts-noto-core \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    # Use the system Chromium instead of a puppeteer-downloaded one.
    PDF_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

RUN useradd --create-home --uid 10001 appuser

# Standalone output already contains the traced node_modules.
COPY --from=builder --chown=appuser:appuser /app/.next/standalone ./
COPY --from=builder --chown=appuser:appuser /app/.next/static ./.next/static

# The PDF pipeline reads the bundled Thai fonts from disk at runtime.
COPY --from=builder --chown=appuser:appuser /app/src/lib/pdf/assets ./src/lib/pdf/assets

USER appuser
EXPOSE 3000

# Chromium needs more than the 64 MB Docker default for /dev/shm; compose sets shm_size.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
