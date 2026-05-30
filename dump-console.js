const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message));
  page.on('requestfailed', request => console.log('BROWSER_REQ_FAILED:', request.url(), request.failure().errorText));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:4566', { waitUntil: 'networkidle2' });
  await browser.close();
})();
