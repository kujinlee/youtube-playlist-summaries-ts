/**
 * E2E test: PDF button for archived videos serves the correct PDF from _archive/_pdf/.
 * Requires dev server running at http://localhost:3000.
 */
import { chromium } from 'playwright';

const BASE_URL  = process.env.BASE_URL ?? 'http://localhost:3000';
const VIDEO_IDX = 8;   // archived, has PDF in _archive/_pdf/
const PDF_FILE  = '08_top-6-tools-code-to-diagrams.pdf';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    failures++;
  }
}

const browser = await chromium.launch({ headless: false, slowMo: 400 });
const page    = await browser.newPage();

try {
  await page.goto(BASE_URL);
  await page.waitForSelector('table');

  // Show archived rows
  await page.locator('input[type="checkbox"]').click();
  await page.waitForTimeout(300);

  // Find video 8 row
  const row = page.locator('tr').filter({
    has: page.locator('td:first-child').filter({ hasText: new RegExp(`^${VIDEO_IDX}$`) }),
  }).first();
  await row.waitFor({ timeout: 10000 });
  await row.scrollIntoViewIfNeeded();
  const title = (await row.innerText()).split('\n')[1]?.trim().slice(0, 60);
  console.log(`Row [${VIDEO_IDX}]: ${title}`);

  check('OBS button hidden (archived)', !(await row.locator('a', { hasText: 'OBS' }).isVisible()));

  // Click PDF button — opens in new tab
  console.log('\nClicking PDF button…');
  const context = browser.contexts()[0];
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    row.locator('a', { hasText: 'PDF' }).first().click(),
  ]);

  await newPage.waitForLoadState('domcontentloaded');
  const url = newPage.url();
  check(`New tab URL contains PDF filename`, url.includes(PDF_FILE));

  // Re-navigate to capture the response headers
  const response = await newPage.goto(url);
  check('HTTP 200', response?.status() === 200);
  check('Content-Type is application/pdf', (response?.headers()['content-type'] ?? '').includes('application/pdf'));

  await newPage.close();

} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
process.exit(failures > 0 ? 1 : 0);
