'use strict';
// Development checks only: never linked to the website. Requires Playwright and Chrome.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const report = { testedAt: new Date().toISOString(), checks: [], browserErrors: [], sourceSha256: {} };
const pages = ['index', 'booking', 'prices', 'computers', 'games', 'about', 'rules'];
const markers = { index: '#nav-cart', booking: '#seat-20', prices: '#calculator-summary', computers: '#equipment-compare-clear', games: '[data-game="dota2"]', about: '#review-list', rules: '#departure-list input' };
for (const folder of ['js', 'css']) for (const file of fs.readdirSync(path.join(root, folder))) {
  const relative = folder + '/' + file;
  report.sourceSha256[relative] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
}
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon' }[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
let browser, context, base;
async function check(name, action) {
  try { await action(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.log('FAIL', name, error.message); }
}
async function open(page, name) {
  await page.goto(`${base}/${name}.html`);
  await page.waitForFunction(() => window.jQuery?.fn.jquery === '3.7.1' && window.TopGame);
  await page.locator(markers[name]).first().waitFor({ state: 'attached' });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.on('page', page => {
    page.on('pageerror', error => report.browserErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.browserErrors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) report.browserErrors.push(`${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => report.browserErrors.push(`${request.url()} ${request.failure()?.errorText}`));
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  for (const width of [375, 768, 1440]) for (const name of pages) {
    await check(`${name}: jQuery, content and no horizontal overflow at ${width}px`, async () => {
      await page.setViewportSize({ width, height: 1000 });
      await open(page, name);
      assert.equal(await page.locator('script[src*="old-js-version"]').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    });
  }
  await open(page, 'booking');
  await check('Empty booking: individual field messages, required attributes and no success', async () => {
    await page.locator('#booking-submit').click();
    for (const id of ['customer-name', 'customer-email', 'customer-phone', 'booking-date', 'booking-time', 'booking-tariff', 'gaming-zone-selection', 'seat-map', 'booking-agreement']) {
      assert.equal(await page.locator('#' + id).getAttribute('aria-invalid'), 'true', id);
      assert.ok(await page.locator('#' + id + '-error').isVisible(), id);
    }
    assert.equal(await page.locator('#booking-success').isVisible(), false);
    assert.equal(await page.locator('#customer-email').getAttribute('required'), '');
  });
  await check('Email/phone formats and immediate correction', async () => {
    await page.locator('#customer-email').fill('bad-email');
    await page.locator('#customer-phone').fill('123');
    assert.equal(await page.locator('#customer-email').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#customer-phone').getAttribute('aria-invalid'), 'true');
    await page.locator('#customer-name').fill('  Test Player  ');
    await page.locator('#customer-email').fill('player@example.com');
    await page.locator('#customer-phone').fill(' +7 (700) 123-45-67 ');
    for (const id of ['customer-name', 'customer-email', 'customer-phone']) assert.equal(await page.locator('#' + id).getAttribute('aria-invalid'), 'false');
  });
  await check('Delegation handles a button inserted after initialization', async () => {
    await page.evaluate(() => $('#seat-20').clone().attr('id', 'late-seat').appendTo('#booking-form'));
    await page.locator('#late-seat').click();
    assert.equal(await page.locator('#seat-20').getAttribute('aria-pressed'), 'true');
    await page.locator('#seat-20').click();
    await page.evaluate(() => $('#late-seat').remove());
  });
  let hourly;
  await check('Mixed-zone booking saves, fades in confirmation and resets all fields', async () => {
    hourly = await page.evaluate(() => TopGame.tariffs.find(item => item.hourly).id);
    await page.locator('#booking-date').fill('2099-11-03');
    await page.locator('#booking-time').fill('14:00');
    await page.locator('#booking-tariff').selectOption(hourly);
    await page.locator('#booking-duration').fill('2');
    await page.locator('#seat-1').click();
    await page.locator('#seat-11').click();
    await page.locator('#booking-agreement').check();
    await page.locator('#booking-submit').click();
    await page.waitForFunction(() => $('#booking-success').hasClass('success') && !$('#booking-success').hasClass('hidden'));
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem('topgame-bookings'))[0]);
    assert.deepEqual(record.seats, [1, 11]);
    assert.equal(record.zone, 'mixed');
    assert.ok(!('email' in record) && !('phone' in record) && !('name' in record));
    for (const id of ['customer-name', 'customer-email', 'customer-phone', 'booking-date', 'booking-time', 'booking-tariff', 'booking-comment']) assert.equal(await page.locator('#' + id).inputValue(), '', id);
    assert.equal(await page.locator('#booking-duration').inputValue(), '1');
    assert.equal(await page.locator('#player-count').inputValue(), '1');
    assert.equal(await page.locator('#booking-agreement').isChecked(), false);
    assert.equal(await page.locator('[data-seat-state="selected"]').count(), 0);
    assert.equal(await page.locator('#booking-result-status strong').innerText(), 'Проверка пройдена.');
    assert.equal(await page.locator('[data-cancel-booking]').count(), 1);
  });
  await check('Cross-tab conflicts and delegated cancellation survive row rebuilding', async () => {
    const second = await context.newPage();
    await open(second, 'booking');
    await second.locator('#booking-date').fill('2099-11-03');
    await second.locator('#booking-time').fill('14:30');
    assert.equal(await second.locator('#seat-1').isDisabled(), true);
    assert.equal(await second.locator('#seat-11').isDisabled(), true);
    await second.locator('[data-cancel-booking]').click();
    await page.waitForFunction(() => $('[data-cancel-booking]').length === 0);
    assert.equal(await second.locator('#seat-1').isDisabled(), false);
    await second.close();
  });
  await check('Reset dismisses feedback with fadeOut callback', async () => {
    await page.locator('#booking-form button[type="reset"]').click();
    await page.waitForFunction(() => $('#booking-success').hasClass('hidden') && $('#booking-success').text() === '');
  });
  await check('New feedback stays visible when it interrupts fadeOut', async () => {
    await page.evaluate(() => {
      TopGame.notify($('#booking-errors'), 'First message', 'error');
      TopGame.notify($('#booking-errors'), '');
      TopGame.notify($('#booking-errors'), 'Replacement message', 'error');
    });
    await page.waitForFunction(() => $('#booking-errors').is(':visible') && $('#booking-errors').text() === 'Replacement message');
    await page.evaluate(() => TopGame.notify($('#booking-errors'), ''));
  });
  await check('Food catalogue, quantity controls and checkout remain functional', async () => {
    await page.locator('[data-add-food="burger"]').click();
    await page.locator('[data-cart-action="increase"][data-item-id="burger"]').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('topgame-cart'))[0].quantity), 2);
    await page.locator('[data-cart-action="decrease"][data-item-id="burger"]').click();
    await page.locator('#food-name').fill('Test Player');
    await page.locator('#food-email').fill('player@example.com');
    await page.locator('#food-phone').fill('+77001234567');
    await page.locator('#food-delivery').selectOption('bar');
    await page.locator('#food-agreement').check();
    await page.locator('#food-checkout').click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('topgame-orders')).length), 1);
    assert.equal(await page.locator('#food-checkout').isDisabled(), true);
  });
  await open(page, 'prices');
  await check('Six tariffs, filters and calculator retain shared pricing', async () => {
    assert.equal(await page.locator('#tariffs article').count(), 6);
    await page.locator('#prices-search').fill('zzzz-no-match');
    assert.equal(await page.locator('#tariffs article').count(), 0);
    await page.locator('#prices-filter-reset').click();
    assert.equal(await page.locator('#tariffs article').count(), 6);
    await page.locator('#calculator-tariff').selectOption(hourly);
    await page.locator('#calculator-players').fill('2');
    await page.locator('#calculator-hours').fill('3');
    const expected = await page.evaluate(id => TopGame.tariffs.find(item => item.id === id).price * 6, hourly);
    assert.ok((await page.locator('#calculator-summary').innerText()).replace(/\s/g, '').includes(String(expected)));
  });
  await open(page, 'computers');
  await check('Equipment comparison handlers survive filter detachment and restoration', async () => {
    await page.locator('#equipment-search').fill('no-match');
    await page.locator('#equipment-filter-reset').click();
    await page.locator('#compare-main').check();
    assert.equal(await page.locator('#equipment-compare-result article').count(), 1);
    await page.locator('[data-remove-zone="main"]').click();
    assert.equal(await page.locator('#compare-main').isChecked(), false);
  });
  await open(page, 'about');
  await check('Review validation, safe text, persistence, sorting and deletion', async () => {
    await page.locator('#review-submit').click();
    assert.equal(await page.locator('#review-name').getAttribute('aria-invalid'), 'true');
    await page.locator('#review-name').fill('<img src=x onerror=alert(1)>');
    await page.locator('#review-rating').selectOption('5');
    await page.locator('#review-text').fill('A test review with more than twenty characters.');
    await page.locator('#review-submit').click();
    assert.equal(await page.locator('#review-list article').count(), 1);
    assert.equal(await page.locator('#review-list img').count(), 0);
    assert.equal(await page.locator('#review-name').inputValue(), '');
    await page.reload(); await page.locator('#review-list article').waitFor();
    await page.locator('#review-sort').selectOption('rating');
    await page.locator('[data-remove-review]').click();
    assert.equal(await page.locator('#review-list article').count(), 0);
  });
  await open(page, 'games');
  await check('Game cards and request validation/persistence remain functional', async () => {
    assert.equal(await page.locator('#game-cards article').count(), 6);
    await page.locator('[data-game="dota2"]').click();
    await page.locator('#visitor-name').fill('Test Player');
    await page.locator('#visitor-email').fill('player@example.com');
    await page.locator('#visitor-phone').fill('+77001234567');
    await page.locator('#visit-date').fill('2099-11-03');
    await page.locator('#players').fill('2');
    await page.locator('#team-yes').check();
    await page.locator('#game-agreement').check();
    await page.locator('#game-request-submit').click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('topgame-game-request')));
    assert.equal(saved.title, 'Dota 2');
    assert.ok(!('email' in saved));
    await page.reload(); await page.locator('[data-game="dota2"]').waitFor();
    assert.equal(await page.locator('#game-title').inputValue(), 'Dota 2');
  });
  await open(page, 'rules');
  await check('Rules array, traversal, slide effects, callbacks and rebuilt buttons', async () => {
    assert.equal(await page.locator('#rules-help-list article').count(), 6);
    await page.locator('#rules-choose-device').click();
    await page.waitForFunction(() => $('#rules-help-detail').is(':visible') && document.activeElement === $('#rules-help-detail h3')[0]);
    assert.equal(await page.locator('#rules-help-list article.selected').count(), 1);
    await page.locator('#rules-choose-account').click();
    assert.equal(await page.locator('#rules-help-list article.selected').count(), 1);
    await page.locator('#rules-detail-close').click();
    await page.waitForFunction(() => $('#rules-help-detail').hasClass('hidden') && document.activeElement.id === 'rules-choose-account');
    await page.locator('#rules-search').fill('устройство');
    await page.locator('#rules-choose-device').click();
    await page.locator('#rules-detail-close').waitFor({ state: 'visible' });
    await page.locator('#rules-detail-close').click();
  });
  await check('Checklist uses live checkbox state and can be completed/reset', async () => {
    for (const field of await page.locator('#departure-list input').all()) await field.check();
    assert.equal(await page.locator('#departure-complete').isDisabled(), false);
    await page.locator('#departure-complete').click();
    await page.locator('#departure-confirmation').waitFor({ state: 'visible' });
    await page.locator('#departure-reset').click();
    assert.equal(await page.locator('#departure-list input:checked').count(), 0);
    assert.equal(await page.locator('#departure-complete').isDisabled(), true);
  });
  await check('Mobile navigation checkbox and Escape remain functional', async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('label[for="main-navigation-toggle"]').click();
    assert.equal(await page.locator('#main-navigation-toggle').isChecked(), true);
    await page.locator('#main-navigation a').first().focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#main-navigation-toggle').isChecked(), false);
  });
  await check('No browser script, console, failed-request or HTTP errors', async () => assert.deepEqual([...new Set(report.browserErrors)], []));
})().catch(error => { report.fatal = error.stack; console.error(error); }).finally(async () => {
  if (browser) await browser.close();
  server.close();
  report.passed = !report.fatal && !report.browserErrors.length && report.checks.every(check => check.passed);
  fs.writeFileSync(path.join(__dirname, 'assignment6-jquery.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failed: report.checks.filter(c => !c.passed).map(c => c.name), fatal: report.fatal }));
  if (!report.passed) process.exitCode = 1;
});
