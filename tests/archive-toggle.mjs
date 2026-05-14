/**
 * E2E test: archive toggle moves files immediately (both directions).
 * Requires dev server running at http://localhost:3000.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL   = process.env.BASE_URL ?? 'http://localhost:3000';
const DATA_ROOT  = process.env.DATA_ROOT ?? '../youtube-playlist-summaries-data';
const SUMMARIES  = `${DATA_ROOT}/video-summaries`;
const ARCHIVE    = `${DATA_ROOT}/_archive`;
const PDF_DIR    = `${DATA_ROOT}/_pdf`;
const ARCH_PDF   = `${DATA_ROOT}/_archive/_pdf`;

// Video 3 — stable English video, always available for testing
const VIDEO_IDX  = 3;
const MD         = '03_spec-driven-development.md';
const PDF        = '03_spec-driven-development.pdf';

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    failures++;
  }
}

async function ensureUnarchived() {
  const arch = JSON.parse(fs.readFileSync(`${DATA_ROOT}/archived.json`, 'utf-8'));
  if (!arch.archived.includes(VIDEO_IDX)) return;
  const body = JSON.stringify({ archived: arch.archived.filter(i => i !== VIDEO_IDX) });
  await fetch(`${BASE_URL}/api/archive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  await new Promise(r => setTimeout(r, 500));
}

async function openMenu(row) {
  const btn = row.locator('button', { hasText: '☰' });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  const menu = row.page().locator('[data-menu-popup]');
  await menu.waitFor({ state: 'visible', timeout: 5000 });
  return menu;
}

await ensureUnarchived();

const browser = await chromium.launch({ headless: false, slowMo: 400 });
const page    = await browser.newPage();

try {
  await page.goto(BASE_URL);
  await page.waitForSelector('table');

  // Show archived rows so the row remains visible after archiving
  await page.locator('input[type="checkbox"]').click();
  await page.waitForTimeout(300);

  const row = page.locator('tr').filter({
    has: page.locator('td:first-child').filter({ hasText: new RegExp(`^${VIDEO_IDX}$`) }),
  }).first();
  await row.waitFor({ timeout: 10000 });
  await row.scrollIntoViewIfNeeded();
  console.log(`Row [${VIDEO_IDX}]: ${(await row.innerText()).split('\n').slice(1, 2).join(' ').trim().slice(0, 60)}`);

  // ── Archive ──────────────────────────────────────────────
  console.log('\n[1] Archiving…');
  let menu = await openMenu(row);
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/archive') && r.request().method() === 'POST'),
    menu.locator('button', { hasText: 'Archive' }).click(),
  ]);
  await page.waitForTimeout(600);

  check('Row opacity 0.4', parseFloat(await row.evaluate(el => getComputedStyle(el).opacity)) < 0.5);

  // Verify OBS not in menu for archived row
  menu = await openMenu(row);
  check('OBS hidden (archived)', !(await menu.locator('text=Open in Obsidian').isVisible()));
  await page.mouse.click(10, 10);
  await page.waitForTimeout(300);

  check('MD → _archive/',    fs.existsSync(`${ARCHIVE}/${MD}`));
  check('MD ← video-summaries/', !fs.existsSync(`${SUMMARIES}/${MD}`));
  const hadPdf = fs.existsSync(`${PDF_DIR}/${PDF}`) || fs.existsSync(`${ARCH_PDF}/${PDF}`);
  if (hadPdf) {
    check('PDF → _archive/_pdf/', fs.existsSync(`${ARCH_PDF}/${PDF}`));
    check('PDF ← _pdf/',          !fs.existsSync(`${PDF_DIR}/${PDF}`));
  } else {
    console.log('  (no PDF — skipping PDF move checks)');
  }

  // ── Un-archive ───────────────────────────────────────────
  console.log('\n[2] Un-archiving…');
  menu = await openMenu(row);
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/archive') && r.request().method() === 'POST'),
    menu.locator('button', { hasText: 'Un-archive' }).click(),
  ]);
  await page.waitForTimeout(600);

  check('Row opacity 1', parseFloat(await row.evaluate(el => getComputedStyle(el).opacity)) >= 1);

  // Verify OBS back in menu for un-archived row
  menu = await openMenu(row);
  check('OBS visible (un-archived)', await menu.locator('text=Open in Obsidian').isVisible());
  await page.mouse.click(10, 10);
  await page.waitForTimeout(300);

  check('MD → video-summaries/', fs.existsSync(`${SUMMARIES}/${MD}`));
  check('MD ← _archive/',        !fs.existsSync(`${ARCHIVE}/${MD}`));

} finally {
  await browser.close();
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`}`);
process.exit(failures > 0 ? 1 : 0);
