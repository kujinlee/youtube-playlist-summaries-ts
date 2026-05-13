/**
 * E2E test: ☰ menu opens with correct items and closes on outside click.
 * Requires dev server running at http://localhost:3000.
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
let failures = 0;
function check(label, condition) {
  if (condition) console.log(`  ✓ ${label}`);
  else { console.error(`  ✗ ${label}`); failures++; }
}

const browser = await chromium.launch({ headless: false, slowMo: 300 });
const page    = await browser.newPage();

try {
  await page.goto(BASE_URL);
  await page.waitForSelector('table');
  await page.waitForTimeout(500);

  // ── Open menu ──────────────────────────────────────────
  console.log('[1] Opening ☰ menu on first row…');
  const menuBtn = page.locator('button', { hasText: '☰' }).first();
  await menuBtn.scrollIntoViewIfNeeded();
  await menuBtn.click();
  await page.waitForTimeout(400);

  const menu = page.locator("[data-menu-popup]");
  check('Dropdown appeared', await menu.isVisible());
  check('Watch on YouTube', await menu.locator('text=Watch on YouTube').isVisible());
  check('View Summary PDF',  await menu.locator('text=View Summary PDF').isVisible());
  check('Deep Dive button',  await menu.locator('button', { hasText: 'Deep Dive' }).isVisible());
  check('Archive item',      await menu.locator('text=Archive').isVisible());

  // ── Close on outside click ─────────────────────────────
  console.log('\n[2] Closing menu with outside click…');
  await page.mouse.click(10, 10);
  await page.waitForTimeout(400);
  check('Dropdown closed', !(await menu.isVisible().catch(() => false)));

  // ── Archived row ───────────────────────────────────────
  console.log('\n[3] Archived video menu: no OBS, shows Un-archive…');
  await page.locator('input[type="checkbox"]').click();
  await page.waitForTimeout(300);
  const archivedRow = page.locator('tr').filter({ has: page.locator('button', { hasText: '↩' }) }).first();
  const archivedMenuBtn = archivedRow.locator('button', { hasText: '☰' });
  await archivedMenuBtn.scrollIntoViewIfNeeded();
  await archivedMenuBtn.click();
  await page.waitForTimeout(400);
  const menu2 = page.locator("[data-menu-popup]");
  check('No Obsidian item for archived', !(await menu2.locator('text=Open in Obsidian').isVisible().catch(() => false)));
  check('Un-archive shown',              await menu2.locator('text=Un-archive').isVisible());

} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
process.exit(failures > 0 ? 1 : 0);
