'use strict';

const express = require('express');
const puppeteer = require('puppeteer-core');
const Eureka = require('eureka-js-client').Eureka;

const app = express();
app.use(express.json({ limit: '10mb' }));

// Path to system-installed Chromium (set via env or default Alpine/Debian path)
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
const PORT = process.env.PORT || 3001;
const EUREKA_URL = process.env.EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE || 'http://eureka-server:8761/eureka/apps/';

const eurekaClient = new Eureka({
  instance: {
    app: 'pdf-service',
    hostName: 'pdf-service', // Automatically mapped in Docker bridge networks
    ipAddr: '127.0.0.1',
    statusPageUrl: `http://pdf-service:${PORT}/health`,
    port: {
      '$': PORT,
      '@enabled': 'true',
    },
    vipAddress: 'pdf-service',
    dataCenterInfo: {
      '@class': 'com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo',
      name: 'MyOwn',
    },
  },
  eureka: {
    serviceUrls: {
      default: [
        EUREKA_URL
      ]
    },
  },
});

eurekaClient.start();

// Make sure to unregister on exit
process.on('SIGINT', () => {
  eurekaClient.stop();
  process.exit();
});
process.on('SIGTERM', () => {
  eurekaClient.stop();
  process.exit();
});

/**
 * POST /render
 * Body: { html: string, options?: { format?: string, printBackground?: boolean } }
 * Returns: application/pdf
 */
app.post('/render', async (req, res) => {
  const { html, options = {} } = req.body;

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "html" field in request body.' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    const page = await browser.newPage();

    // Set HTML content and wait for all network requests to settle
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Emulate screen for CSS @media screen rules
    await page.emulateMediaType('screen');

    const pdf = await page.pdf({
      format: options.format || 'A4',
      printBackground: options.printBackground !== false, // default: true
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm',
      },
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'X-Generated-By': 'pdf-service/puppeteer-core',
    });
    res.send(pdf);

  } catch (err) {
    if (browser) await browser.close().catch(() => { });
    console.error('[pdf-service] Render error:', err.message);
    res.status(500).json({ error: 'PDF generation failed.', details: err.message });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', engine: 'puppeteer-core' }));

app.listen(PORT, () => {
  console.log(`[pdf-service] Listening on port ${PORT}`);
  console.log(`[pdf-service] Chromium path: ${CHROMIUM_PATH}`);
});
