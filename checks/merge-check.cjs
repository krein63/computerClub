'use strict';
// Integration checks for features retained from both archives; not loaded by the site.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const report = { testedAt: new Date().toISOString(), checks: [], errors: [], sourceSha256: {} };
for (const file of fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js'))) report.sourceSha256[`js/${file}`] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'js', file))).digest('hex');
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
    try { res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
    catch { res.writeHead(404); res.end(); }
});
async function check(name, action) {
    try { await action(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.message }); report.errors.push(name); }
}
let browser;
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox'], env: { ...process.env, LD_LIBRARY_PATH: process.env.CHROMIUM_LIB || '' } });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const a = await context.newPage(), b = await context.newPage();
    const errors = [];
    for (const page of [a, b]) {
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
    }
    await a.goto(`${base}/prices.html`);
    const tariffs = await a.evaluate(() => window.TopGame.tariffs);
    await check('Six tariffs retained consistently in cards, table and select', async () => {
        assert.equal(tariffs.length, 6);
        assert.equal(await a.locator('#tariffs article').count(), 6);
        assert.equal(await a.locator('#prices-table-1 tbody tr').count(), 6);
        assert.equal(await a.locator('#calculator-tariff option').count(), 6);
    });
    for (const tariff of tariffs) {
        await check(`Calculator: ${tariff.id} uses the shared price and duration`, async () => {
            await a.locator('#calculator-tariff').selectOption(tariff.id);
            await a.locator('#calculator-players').fill('2');
            if (tariff.hourly) await a.locator('#calculator-hours').fill('2');
            const hours = tariff.hourly ? 2 : tariff.duration;
            assert.equal(await a.locator('#calculator-hours').inputValue(), String(hours));
            const total = await a.evaluate(({ id, hours }) => window.TopGame.estimateVisit(window.TopGame.tariffs, id, hours, 2).amount, { id: tariff.id, hours });
            assert.equal(total, tariff.price * 2 * (tariff.hourly ? hours : 1));
            const text = (await a.locator('#calculator-summary').innerText()).replace(/\s/g, '');
            assert.ok(text.includes(String(total)));
        });
    }
    await check('Calculator reset restores one PC, one hour and a valid next link', async () => {
        await a.locator('#price-calculator-form button[type="reset"]').click();
        await a.waitForFunction(() => document.querySelector('#calculator-hours').value === '1');
        assert.equal(await a.locator('#calculator-players').inputValue(), '1');
        assert.equal(await a.locator('#calculator-booking-link').isVisible(), true);
    });
    await check('Five-hour package and 20 players carry to booking', async () => {
        await a.locator('#calculator-tariff').selectOption('five-hours');
        await a.locator('#calculator-players').fill('20');
        await a.locator('#calculator-booking-link').click();
        assert.equal(await a.locator('#booking-tariff').inputValue(), 'five-hours');
        assert.equal(await a.locator('#booking-duration').inputValue(), '5');
        assert.equal(await a.locator('#player-count').inputValue(), '20');
    });
    for (const page of [a, b]) {
        if (page === b) await page.goto(`${base}/booking.html`);
        await page.locator('#booking-date').fill('2099-10-22');
        await page.locator('#booking-time').fill('14:00');
    }
    await a.locator('#customer-name').fill('Merge Test');
    await a.locator('#customer-email').fill('merge@example.com');
    await a.locator('#customer-phone').fill('+7 700 123 45 67');
    await a.locator('#booking-agreement').check();
    await check('20 PCs can be selected across MAIN, DUO and PRIVATE', async () => {
        for (let i = 1; i <= 20; i++) await a.locator(`#seat-${i}`).click();
        assert.equal(await a.locator('#player-count').inputValue(), '20');
        assert.equal(await a.locator('[data-seat-state="selected"]').count(), 20);
        await a.locator('#booking-submit').click();
        assert.equal(await a.locator('[data-cancel-booking]').count(), 1);
        const record = await a.evaluate(() => JSON.parse(localStorage.getItem('topgame-bookings'))[0]);
        assert.equal(record.zone, 'mixed');
        assert.equal(record.seats.length, 20);
        assert.equal(record.duration, 5);
    });
    await check('Repeated identical booking creates no duplicate', async () => {
        await a.locator('#booking-submit').click();
        assert.equal(await a.evaluate(() => JSON.parse(localStorage.getItem('topgame-bookings')).length), 1);
    });
    await check('A second tab sees all overlapping occupied PCs', async () => {
        await b.waitForFunction(() => document.querySelectorAll('[data-seat-state="occupied"]').length === 20);
        assert.equal(await b.locator('[data-cancel-booking]').count(), 1);
    });
    await check('Cancellation in another tab releases PCs and updates the first tab', async () => {
        await b.locator('[data-cancel-booking]').click();
        await a.waitForFunction(() => document.querySelectorAll('[data-cancel-booking]').length === 0);
        assert.equal(await a.locator('[data-seat-state="occupied"]').count(), 0);
    });
    await check('Food quantity controls and storage are retained', async () => {
        await a.locator('[data-add-food="burger"]').click();
        await a.locator('[data-cart-action="increase"][data-item-id="burger"]').click();
        assert.equal(await a.evaluate(() => JSON.parse(localStorage.getItem('topgame-cart'))[0].quantity), 2);
        await a.locator('[data-cart-action="decrease"][data-item-id="burger"]').click();
        await a.locator('#food-name').fill('Merge Test');
        await a.locator('#food-email').fill('merge@example.com');
        await a.locator('#food-phone').fill('+7 700 123 45 67');
        await a.locator('#food-delivery').selectOption('bar');
        await a.locator('#food-agreement').check();
        await a.locator('#food-checkout').click();
        await a.reload();
        const orders = await a.evaluate(() => JSON.parse(localStorage.getItem('topgame-orders')));
        assert.equal(orders.length, 1);
        assert.equal(orders[0].total, 2700);
        assert.equal(await a.locator('#food-checkout').isDisabled(), true);
    });
    await a.goto(`${base}/games.html`);
    await check('Six distinct game covers load successfully', async () => {
        const covers = await a.locator('#game-cards img').evaluateAll(async images => {
            for (const image of images) image.loading = 'eager';
            await Promise.all(images.map(image => image.decode()));
            return images.map(image => ({ src: image.getAttribute('src'), width: image.naturalWidth }));
        });
        assert.equal(covers.length, 6);
        assert.equal(new Set(covers.map(image => image.src)).size, 6);
        assert.ok(covers.every(image => image.width > 0));
    });
    await check('Game request survives reload without persisted contact fields', async () => {
        await a.locator('[data-game="dota2"]').click();
        await a.locator('#visitor-name').fill('Merge Test');
        await a.locator('#visitor-email').fill('merge@example.com');
        await a.locator('#visitor-phone').fill('+7 700 123 45 67');
        await a.locator('#visit-date').fill('2099-10-22');
        await a.locator('#players').fill('2');
        await a.locator('#team-yes').check();
        await a.locator('#game-agreement').check();
        await a.locator('#request-comment').fill('Version request');
        await a.locator('#game-request-submit').click();
        const saved = await a.evaluate(() => JSON.parse(localStorage.getItem('topgame-game-request')));
        assert.equal(saved.title, 'Dota 2');
        assert.ok(!('name' in saved) && !('email' in saved) && !('phone' in saved));
        await a.reload();
        assert.equal(await a.locator('#game-title').inputValue(), 'Dota 2');
        assert.equal(await a.locator('#visitor-email').inputValue(), '');
        assert.equal(await a.locator('#request-comment').inputValue(), 'Version request');
        assert.equal(await a.locator('[data-game="dota2"]').getAttribute('aria-pressed'), 'true');
    });
    await check('Integration produces no console, script or resource errors', async () => assert.deepEqual(errors, []));
})().catch(error => report.errors.push(error.stack)).finally(async () => {
    if (browser) await browser.close();
    server.close();
    report.passed = report.errors.length === 0;
    fs.writeFileSync(path.join(__dirname, 'merge-update.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks.length, passed: report.passed, errors: report.errors }));
    if (!report.passed) process.exitCode = 1;
});
