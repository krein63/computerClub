'use strict';

// Development-only browser verification; not loaded by the site.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const report = { testedAt: new Date().toISOString(), checks: [], lowContrast: [], errors: [], sourceSha256: {} };
for (const file of ['js/main.js', 'js/prices.js', 'css/base.css', 'css/bootstrap.min.css']) {
    report.sourceSha256[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}
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
async function inspect(page, selector, minimum = 3) {
    return page.locator(selector).evaluateAll((elements, minimumRatio) => {
        const parse = value => (value.match(/[\d.]+/g) || []).map(Number);
        const lum = rgb => rgb.slice(0, 3).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
        const failures = [];
        for (const element of elements) {
            if (!element.getClientRects().length || !element.checkVisibility() || element.closest('[disabled]')) continue;
            if (!Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) continue;
            const style = getComputedStyle(element);
            let background = [255, 255, 255];
            const layers = [];
            for (let parent = element; parent; parent = parent.parentElement) layers.unshift(parse(getComputedStyle(parent).backgroundColor));
            for (const color of layers) {
                if (color.length < 3) continue;
                const alpha = color[3] ?? 1;
                background = color.slice(0, 3).map((value, i) => value * alpha + background[i] * (1 - alpha));
            }
            const color = parse(style.color);
            const alpha = color[3] ?? 1;
            const foreground = color.slice(0, 3).map((value, i) => value * alpha + background[i] * (1 - alpha));
            const a = lum(foreground), b = lum(background);
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            if (ratio < minimumRatio) failures.push({ tag: element.tagName, id: element.id, text: element.textContent.trim().slice(0, 90), ratio: Number(ratio.toFixed(2)), color: style.color, background });
        }
        return failures;
    }, minimum);
}
let browser;
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const width of [375, 768, 1440]) {
        browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined,
            args: process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox'],
            env: { ...process.env, LD_LIBRARY_PATH: process.env.CHROMIUM_LIB || '' } });
        const context = await browser.newContext({ viewport: { width, height: 1000 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        for (const file of ['index', 'prices', 'computers', 'booking', 'games', 'rules', 'about']) {
            await page.goto(`${base}/${file}.html`);
            // Bootstrap colours have a 150 ms transition after theme classes change.
            await page.waitForTimeout(200);
            await check(`${width}: ${file} no horizontal page overflow`, async () => {
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
            });
            await check(`${width}: ${file} visible text has no severe contrast failures`, async () => {
                const failures = await inspect(page, 'main *, header a, footer *');
                report.lowContrast.push(...failures.map(item => ({ width, page: file, ...item })));
                assert.deepEqual(failures, []);
            });
            if (file === 'prices') {
                await check(`${width}: all four comparison fields available`, async () => {
                    const mobile = page.locator('#prices-comparison-mobile');
                    assert.equal(await mobile.isVisible(), width < 768);
                    assert.equal(await page.locator('#prices-table-1').isVisible(), width >= 768);
                    if (width < 768) {
                        assert.equal(await mobile.locator('article').count(), 4);
                        assert.equal(await mobile.locator('dd:visible').count(), 12);
                    } else assert.equal(await page.locator('#prices-table-1 tbody td:visible').count(), 12);
                    assert.deepEqual(await inspect(page, '#tariff-comparison *', 4.5), []);
                });
                if (process.env.QA_SCREENSHOTS) await page.locator('#tariff-comparison').screenshot({ path: path.join(process.env.QA_SCREENSHOTS, `prices-${width}.png`) });
                await check(`${width}: calculator error and confirmation remain readable`, async () => {
                    await page.locator('#calculator-players').fill('0');
                    await page.locator('#price-calculator-form button[type="submit"]').click();
                    assert.equal(await page.locator('#calculator-players-error').isVisible(), true);
                    assert.deepEqual(await inspect(page, '#calculator-summary, #calculator-status, #calculator-players-error', 4.5), []);
                    await page.locator('#calculator-players').fill('2');
                    await page.locator('#price-calculator-form button[type="submit"]').click();
                    assert.deepEqual(await inspect(page, '#calculator-summary, #calculator-status', 4.5), []);
                });
            }
            if (file === 'rules') {
                await check(`${width}: Rules table text readable`, async () => assert.deepEqual(await inspect(page, '#rules-table-1 *', 4.5), []));
            }
            if (file === 'booking') {
                await page.evaluate(() => {
                    const start = window.TopGame.localDateTime('2099-10-22', '15:00');
                    localStorage.setItem('topgame-bookings', JSON.stringify([{ id: 'DEMO-BOOK-VISIBILITY-CHECK-1234567890', zone: 'private', tariff: 'private', date: '2099-10-22', time: '15:00', duration: 5, seats: [16, 17, 18, 19], start, end: start + 5 * 3600000 }]));
                });
                await page.reload();
                await page.waitForTimeout(200);
                await check(`${width}: saved booking ID, details and cancel are readable`, async () => {
                    assert.equal(await page.locator('#local-bookings [data-cancel-booking]').count(), 1);
                    assert.deepEqual(await inspect(page, '#local-bookings *', 4.5), []);
                    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
                });
                if (process.env.QA_SCREENSHOTS) await page.locator('#local-bookings').screenshot({ path: path.join(process.env.QA_SCREENSHOTS, `bookings-${width}.png`) });
                await check(`${width}: cancellation still works after theme update`, async () => {
                    await page.locator('#local-bookings [data-cancel-booking]').click();
                    assert.equal(await page.locator('#local-bookings [data-cancel-booking]').count(), 0);
                    assert.match(await page.locator('#local-bookings-status').innerText(), /отменена/);
                });
            }
        }
        await check(`${width}: no console or resource errors`, async () => assert.deepEqual(errors, []));
        await context.close();
        await browser.close();
        browser = null;
    }
})().catch(error => report.errors.push(error.stack)).finally(async () => {
    if (browser) await browser.close();
    server.close();
    report.passed = report.errors.length === 0;
    fs.writeFileSync(path.join(__dirname, 'visibility-update.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks.length, passed: report.passed, errors: report.errors, contrastFailures: report.lowContrast.slice(0, 15) }));
    if (!report.passed) process.exitCode = 1;
});
