// Renders the banner and icon from art.html into .wordpress-org/. Needs playwright-core and its Chromium:
// PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core node render.cjs
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const path = require('path');
const out = path.resolve(__dirname, '../../../../.wordpress-org');
(async () => {
  const browser = await chromium.launch();
  const shot = async (scale, target, file) => {
    const page = await (await browser.newContext({ deviceScaleFactor: scale })).newPage();
    await page.goto('file://' + path.resolve(__dirname, 'art.html'));
    await page.locator(target).screenshot({ path: path.join(out, file) });
  };
  await shot(1, '#banner', 'banner-772x250.png');
  await shot(2, '#banner', 'banner-1544x500.png');
  await shot(0.5, '#icon', 'icon-128x128.png');
  await shot(1, '#icon', 'icon-256x256.png');
  await browser.close();
})();
