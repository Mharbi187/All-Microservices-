# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Install system Chromium + fonts (much smaller than bundled puppeteer Chromium)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    && rm -rf /var/cache/apk/*

# Set chromium path for puppeteer-core
ENV CHROMIUM_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /app

# Copy and install dependencies (production only)
COPY package.json .
RUN npm install --omit=dev && npm cache clean --force

# Copy application source
COPY index.js .

EXPOSE 3001

# Run as non-root user for security
RUN addgroup -g 1001 -S pdfuser && adduser -u 1001 -S pdfuser -G pdfuser
USER pdfuser

CMD ["node", "index.js"]
