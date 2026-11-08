'use strict';
// Development only. Set PLAYWRIGHT_MODULE / CHROMIUM_PATH for an existing install.
// Optional JQUERY_TEST_FILE: verified official CDN bytes, never a production fallback.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const report = { testedAt: new Date().toISOString(), checks: [], errors: [], sourceSha256: {}, jqueryTestMode: process.env.JQUERY_TEST_FILE ? 'Integrity-verified cache; live CDN not tested' : 'Live official CDN' };
for (const file of fs.readdirSync(path.join(root, 'js'))) report.sourceSha256['js/' + file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'js', file))).digest('hex');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try { res.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.ico': 'image/x-icon' }[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
let browser, context, page, base;
async function check(name, action) {
  try { await action(); report.checks.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.log('FAIL', name, error.message); }
}
async function open(name, marker) { await page.goto(`${base}/${name}.html`); await page.locator(marker).first().waitFor(); }
const compact = text => text.replace(/\s/g, '');
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.on('page', target => {
    target.on('pageerror', e => report.errors.push(e.message));
    target.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
    target.on('response', r => { if (r.status() >= 400) report.errors.push(`${r.status()} ${r.url()}`); });
    target.on('requestfailed', r => report.errors.push(`${r.url()} ${r.failure()?.errorText}`));
  });
  if (process.env.JQUERY_TEST_FILE) {
    const bytes = fs.readFileSync(process.env.JQUERY_TEST_FILE);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('base64'), '/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=');
    await context.route('https://code.jquery.com/jquery-3.7.1.min.js', route => route.fulfill({ body: bytes, contentType: 'text/javascript' }));
  }
  page = await context.newPage();
  await check('Budget finder compares 5 players / 5 hours using full package prices', async () => {
    await open('prices', '#finder-results [data-package]');
    await page.locator('#finder-players').fill('5');
    await page.locator('#finder-hours').fill('5');
    await page.locator('#finder-budget').fill('28000');
    assert.deepEqual(await page.locator('#finder-results [data-package]').evaluateAll(nodes => nodes.map(n => n.dataset.package)), ['five-hours']);
    assert.ok(compact(await page.locator('#finder-results').innerText()).includes('27000'));
    assert.ok(compact(await page.locator('#finder-results').innerText()).includes('5400'));
  });
  await check('Zero and insufficient budget produce an explicit empty result', async () => {
    for (const budget of ['0', '26999']) {
      await page.locator('#finder-budget').fill(budget);
      assert.equal(await page.locator('#finder-results [data-package]').count(), 0);
      assert.match(await page.locator('#finder-status').innerText(), /бюджет/);
    }
  });
  await check('Boundary budget, optional budget and fixed duration are respected', async () => {
    await page.locator('#finder-budget').fill('27000');
    assert.equal(await page.locator('[data-package="five-hours"]').count(), 1);
    await page.locator('#finder-budget').fill('');
    assert.equal(await page.locator('#finder-results [data-package]').count(), 3);
    assert.equal(await page.locator('[data-package="three-hours"]').count(), 0);
    assert.equal(await page.locator('[data-package="night"]').count(), 0);
    await page.locator('#finder-period').selectOption('night');
    assert.equal(await page.locator('#finder-results [data-package]').first().getAttribute('data-package'), 'night');
    assert.ok(compact(await page.locator('[data-package="night"]').innerText()).includes('23500'));
    assert.match(await page.locator('[data-package="night"]').innerText(), /Оплачено 8 ч/);
  });
  await check('Native delegation works after rebuilding results and passes values to booking', async () => {
    await page.locator('[data-choose-package="five-hours"]').click();
    assert.equal(await page.locator('#calculator-tariff').inputValue(), 'five-hours');
    assert.equal(await page.locator('#calculator-players').inputValue(), '5');
    assert.equal(await page.locator('#calculator-hours').inputValue(), '5');
    assert.equal(await page.locator('[data-package="five-hours"]').evaluate(n => n.classList.contains('active')), true);
    const href = await page.locator('#calculator-booking-link').getAttribute('href');
    assert.ok(href.includes('tariff=five-hours') && href.includes('players=5') && href.includes('hours=5'));
    await page.locator('#calculator-booking-link').click();
    await page.locator('#seat-20').waitFor();
    assert.equal(await page.locator('#player-count').inputValue(), '5');
    assert.equal(await page.locator('#booking-tariff').inputValue(), 'five-hours');
  });
  await check('Private-zone capacity, fractional players and hours reject invalid input', async () => {
    await open('prices', '#finder-players');
    await page.locator('#finder-zone').selectOption('private');
    await page.locator('#finder-players').fill('6');
    assert.equal(await page.locator('#finder-players').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#finder-results [data-package]').count(), 0);
    await page.locator('#finder-players').fill('1.5');
    assert.equal(await page.locator('#finder-players').getAttribute('aria-invalid'), 'true');
    await page.locator('#finder-players').fill('5');
    assert.equal(await page.locator('#finder-players').getAttribute('aria-invalid'), 'false');
    assert.equal(await page.locator('#finder-results [data-package]').first().getAttribute('data-package'), 'private');
    await page.locator('#finder-hours').fill('13');
    assert.equal(await page.locator('#finder-hours').getAttribute('aria-invalid'), 'true');
    await page.locator('#finder-hours').fill('2');
    assert.equal(await page.locator('#finder-hours').getAttribute('aria-invalid'), 'false');
    assert.ok(compact(await page.locator('#finder-results').innerText()).includes('25000'));
  });
  await check('Budget rejects negative/fractional values and reset restores the finder', async () => {
    for (const value of ['-1', '10.5']) {
      await page.locator('#finder-budget').fill(value);
      assert.equal(await page.locator('#finder-budget').getAttribute('aria-invalid'), 'true');
    }
    await page.locator('#tariff-finder-form button[type="submit"]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'finder-budget');
    await page.locator('#tariff-finder-form button[type="reset"]').click();
    await page.waitForFunction(() => document.querySelector('#finder-players').value === '1' && document.querySelector('#finder-budget').getAttribute('aria-invalid') === 'false');
    assert.equal(await page.locator('#finder-zone').inputValue(), 'shared');
    assert.equal(await page.locator('#finder-results [data-package]').count(), 4);
  });
  await check('Calculator rejects invalid input, clears adjacent errors and confirms only valid data', async () => {
    await page.locator('#calculator-players').fill('0');
    await page.locator('#price-calculator-form button[type="submit"]').click();
    assert.equal(await page.locator('#calculator-players-error').isVisible(), true);
    assert.equal(await page.locator('#calculator-status').evaluate(n => n.classList.contains('error')), true);
    assert.equal(await page.locator('#calculator-booking-link').isVisible(), false);
    await page.locator('#calculator-players').fill('2');
    assert.equal(await page.locator('#calculator-players-error').isVisible(), false);
    await page.locator('#price-calculator-form button[type="submit"]').click();
    assert.equal(await page.locator('#calculator-status').evaluate(n => n.classList.contains('success')), true);
  });
  await check('Prices feature functions with all jQuery scripts excluded', async () => {
    const native = await browser.newContext();
    await native.route('**/js/main.js', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
    await native.route('**/js/food.js', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
    await native.route('https://code.jquery.com/jquery-3.7.1.min.js', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
    const solo = await native.newPage();
    const errors = []; solo.on('pageerror', e => errors.push(e.message));
    await solo.goto(base + '/prices.html');
    await solo.locator('#finder-results [data-choose-package]').first().click();
    assert.equal(await solo.evaluate(() => typeof window.jQuery), 'undefined');
    assert.equal(await solo.locator('#calculator-booking-link').isVisible(), true);
    await solo.locator('#prices-search').fill('PRIVATE');
    assert.equal(await solo.locator('#tariffs [data-tariff]').count(), 1);
    assert.deepEqual(errors, []);
    await native.close();
  });
  await check('Favorites empty state, delegated add, reload and removal work', async () => {
    await open('games', '[data-favorite-game="dota2"]');
    await page.locator('#games-favorites').selectOption('favorites');
    assert.equal(await page.locator('#game-cards [data-game]').count(), 0);
    assert.match(await page.locator('#game-cards').innerText(), /Подходящих игр нет/);
    await page.locator('#games-filter-reset').click();
    await page.locator('[data-favorite-game="dota2"]').click();
    await page.reload();
    await page.locator('#games-favorites').selectOption('favorites');
    assert.equal(await page.locator('#game-cards [data-game]').count(), 1);
    assert.equal(await page.locator('[data-favorite-game="dota2"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-game="dota2"]').click();
    assert.equal(await page.locator('#game-title').inputValue(), 'Dota 2');
    await page.locator('[data-favorite-game="dota2"]').click();
    assert.equal(await page.locator('#game-cards [data-game]').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'games-favorites');
  });
  await check('Favorites degrade gracefully when storage is unavailable', async () => {
    await page.addInitScript(() => { Storage.prototype.setItem = function () { throw Error('Blocked for testing'); }; });
    await page.reload();
    await page.locator('[data-favorite-game="dota2"]').click();
    assert.match(await page.locator('#games-favorite-status').innerText(), /до перезагрузки/);
    assert.equal(await page.locator('[data-favorite-game="dota2"]').getAttribute('aria-pressed'), 'true');
    // Use a fresh page so the injected storage restriction cannot affect other checks.
    await page.close(); page = await context.newPage();
  });
  await check('Checklist draft restores on reload; unfinished filter and reset work', async () => {
    await open('rules', '#departure-clients');
    await page.locator('#departure-clients').check();
    await page.locator('#departure-filter').click();
    assert.equal(await page.locator('#departure-clients').isVisible(), false);
    await page.reload();
    await page.locator('#departure-clients').waitFor();
    assert.equal(await page.locator('#departure-clients').isChecked(), true);
    assert.match(await page.locator('#departure-draft-note').innerText(), /Восстановлена/);
    await page.locator('#departure-reset').click();
    assert.equal(await page.locator('#departure-list input:checked').count(), 0);
    assert.equal(await page.locator('#departure-list input:visible').count(), 4);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('topgame-departure-draft')), null);
  });
  await check('Completion clears the draft; stale drafts never mark a new visit complete', async () => {
    for (const input of await page.locator('#departure-list input').all()) await input.check();
    await page.locator('#departure-complete').click();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('topgame-departure-draft')), null);
    await page.evaluate(() => sessionStorage.setItem('topgame-departure-draft', JSON.stringify({ ids: ['clients', 'browser', 'belongings', 'workstation'], savedAt: Date.now() - 3 * 60 * 60 * 1000 })));
    await page.reload();
    await page.locator('#departure-clients').waitFor();
    assert.equal(await page.locator('#departure-list input:checked').count(), 0);
    assert.equal(await page.locator('#departure-complete').isDisabled(), true);
  });
  await check('Navigation moves active state between booking, menu and cart', async () => {
    await open('booking', '#nav-cart');
    for (const [hash, id] of [['#food-menu', 'nav-food'], ['#food-cart', 'nav-cart'], ['#booking-form', 'nav-booking']]) {
      await page.evaluate(hash => { location.hash = hash; }, hash);
      await page.waitForFunction(id => document.querySelector('#' + id).classList.contains('active'), id);
      assert.equal(await page.locator('#main-navigation .nav-link.active').count(), 1);
    }
  });
  await check('New content and validation fit phone and tablet widths', async () => {
    for (const name of ['prices', 'games', 'rules']) for (const width of [320, 375, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await open(name, name === 'prices' ? '#finder-status' : name === 'games' ? '#games-favorites' : '#departure-filter');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflow at ${width}`);
    }
  });
  await check('No console, HTTP, failed request or script errors', async () => assert.deepEqual(report.errors, []));
})().catch(error => { report.fatal = error.stack; console.error(error); }).finally(async () => {
  if (browser) await browser.close(); server.close();
  report.passed = !report.fatal && !report.errors.length && report.checks.every(check => check.passed);
  fs.writeFileSync(path.join(__dirname, 'endterm.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, failed: report.checks.filter(c => !c.passed).map(c => c.name), fatal: report.fatal }));
  if (!report.passed) process.exitCode = 1;
});
