const puppeteer = require('puppeteer');
const fs = require('fs');

// Ensure screenshots directory exists
if (!fs.existsSync('./screenshots')) {
    fs.mkdirSync('./screenshots');
}

(async () => {
    console.log("Launching browser to capture full-page screenshots...");
    // Launch a headless browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Emulate a mobile device layout (iPhone 12/13/14 format)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    const url = 'http://localhost:8082'; // Your Expo web URL 

    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait an extra second for any animations/fonts to load
        await new Promise(r => setTimeout(r, 2000));

        // Capture FULL PAGE screenshot (it will scroll automatically and stitch the image)
        const filename = `./screenshots/Full_Page_Home.png`;
        await page.screenshot({ path: filename, fullPage: true });

        console.log(`✅ Success! Full page screenshot saved to ${filename}`);

        // You can add more navigation logic here for other pages:
        // await page.click('#some-button');
        // await page.waitForNavigation();
        // await page.screenshot({ path: './screenshots/Full_Page_Next.png', fullPage: true });

    } catch (e) {
        console.error("Failed to load page. Make sure you pressed 'w' in the Expo terminal to start the Web server.");
        console.error(e);
    }

    await browser.close();
})();
