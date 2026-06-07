FROM node:20-alpine

LABEL maintainer="NexusAid Monitoring"
LABEL description="OpenWA WhatsApp API Gateway for NexusAid alerts"

# Install Chromium and dependencies for Puppeteer (WhatsApp Web)
RUN apk add --no-cache \
    git \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Clone OpenWA repository
RUN git clone https://github.com/rmyndharis/OpenWA.git .

# Install dependencies and build
RUN npm install
RUN npm run build

EXPOSE 8282

# Override the port
ENV PORT=8282

CMD ["npm", "run", "start:prod"]
