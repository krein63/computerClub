'use strict';

// QA only; never loaded by the website. Requires Playwright and a browser.
// NODE_PATH=/path/to/node_modules node checks/games-rules-check.cjs
// Optional: CHROMIUM_PATH=/path/to/chromium and CHROMIUM_LIB=/path/to/libs
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const repo = path.resolve(__dirname, '..');
const report = { testedAt: new Date().toISOString(), checks: [], errors: [], sourceSha256: {} };
for (const file of ['js/games.js', 'js/rules.js', 'rules.html', 'css/base.css', 'css/bootstrap.min.css']) {
    report.sourceSha256[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex');
}
const server = http.createServer((request, response) => {
    const file = path.resolve(repo, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(repo + path.sep)) { response.writeHead(403); response.end(); return; }
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
    try {
        response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        response.end(fs.readFileSync(file));
    } catch { response.writeHead(404); response.end(); }
});
let browser;
async function check(name, action) {
    try { await action(); report.checks.push({ name, passed: true }); }
    catch (error) { report.checks.push({ name, passed: false, error: error.message }); report.errors.push(name); }
}
function equal(actual, expected) { assert.equal(actual, expected); }
async function noOverflow(page) {
    equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
}

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const width of [375, 768, 1440]) {
        browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || undefined,
        args: process.env.CHROMIUM_ARGS ? JSON.parse(process.env.CHROMIUM_ARGS) : ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        env: { ...process.env, LD_LIBRARY_PATH: process.env.CHROMIUM_LIB || process.env.LD_LIBRARY_PATH || '' }
        });
        const context = await browser.newContext({ viewport: { width, height: 1000 } });
        const page = await context.newPage();
        const runtimeErrors = [];
        page.on('pageerror', error => runtimeErrors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
        page.on('response', response => { if (response.status() >= 400) runtimeErrors.push(`${response.status()}: ${response.url()}`); });
        for (const file of ['index.html', 'prices.html', 'computers.html', 'booking.html', 'games.html', 'rules.html', 'about.html']) {
            await check(`${width}: ${file} loads without overflow`, async () => {
                await page.goto(`${base}/${file}`);
                await noOverflow(page);
            });
        }
        await page.goto(`${base}/rules.html`);
        await check(`${width}: Rules starts with six results and 0/4`, async () => {
            equal(await page.locator('#rules-help-list article').count(), 6);
            equal(await page.locator('#departure-complete').isDisabled(), true);
            assert.match(await page.locator('#departure-progress').innerText(), /0 из 4/);
        });
        await check(`${width}: Rules search and category combine; no-results and reset`, async () => {
            await page.locator('#rules-search').fill('  МЫШЬ  ');
            equal(await page.locator('#rules-help-list article').count(), 1);
            await page.locator('#rules-category').selectOption('account');
            equal(await page.locator('#rules-help-list article').count(), 0);
            assert.match(await page.locator('#rules-help-list').innerText(), /нет/);
            await page.locator('#rules-filter-reset').click();
            equal(await page.locator('#rules-help-list article').count(), 6);
        });
        await check(`${width}: Rules selection, focus, close, filtered-out selection`, async () => {
            await page.locator('#rules-choose-device').click();
            equal(await page.locator('#rules-choose-device').getAttribute('aria-pressed'), 'true');
            assert.match(await page.locator('#rules-help-detail').innerText(), /Не разбирайте/);
            equal(await page.locator('#rules-help-detail a').getAttribute('href'), 'about.html#contacts');
            equal(await page.evaluate(() => document.activeElement.tagName), 'H3');
            await page.locator('#rules-detail-close').click();
            equal(await page.evaluate(() => document.activeElement.id), 'rules-choose-device');
            await page.locator('#rules-choose-device').click();
            await page.locator('#rules-category').selectOption('account');
            assert.match(await page.locator('#rules-help-detail').innerText(), /Выберите ситуацию/);
            await page.locator('#rules-filter-reset').click();
        });
        await check(`${width}: Checklist partial, complete, repeated confirmation, uncheck and reset`, async () => {
            await page.locator('#departure-clients').check();
            await page.locator('#departure-browser').check();
            assert.match(await page.locator('#departure-progress').innerText(), /2 из 4/);
            equal(await page.locator('#departure-remaining li').count(), 2);
            equal(await page.locator('#departure-complete').isDisabled(), true);
            await page.locator('#departure-belongings').check();
            await page.locator('#departure-workstation').check();
            equal(await page.locator('#departure-complete').isDisabled(), false);
            await page.locator('#departure-complete').click();
            assert.match(await page.locator('#departure-confirmation').innerText(), /Самопроверка завершена/);
            await page.locator('#departure-complete').click();
            equal(await page.locator('#departure-confirmation').count(), 1);
            await page.locator('#departure-clients').uncheck();
            equal(await page.locator('#departure-confirmation').isVisible(), false);
            equal(await page.locator('#departure-complete').isDisabled(), true);
            await page.locator('#departure-reset').click();
            equal(await page.locator('#departure-list input:checked').count(), 0);
            equal(await page.evaluate(() => document.activeElement.id), 'departure-clients');
            await page.keyboard.press('Space');
            equal(await page.locator('#departure-clients').isChecked(), true);
            await noOverflow(page);
        });
        if (width === 375 && process.env.QA_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.QA_SCREENSHOTS, 'rules-phone.png'), fullPage: true });
        await page.goto(`${base}/games.html`);
        await check(`${width}: Games connected filters, empty state, sort and reset`, async () => {
            equal(await page.locator('#game-cards article').count(), 6);
            await page.locator('#games-search').fill('counter');
            equal(await page.locator('#game-cards article').count(), 1);
            await page.locator('#games-category').selectOption('sports');
            equal(await page.locator('#game-cards article').count(), 0);
            await page.locator('#games-filter-reset').click();
            await page.locator('#games-availability').selectOption('source');
            equal(await page.locator('#game-cards article').count(), 2);
            await page.locator('#games-sort').selectOption('genre');
            await page.locator('#games-filter-reset').click();
            equal(await page.locator('#game-cards article').count(), 6);
        });
        await check(`${width}: Empty Games form shows specific errors and focuses name`, async () => {
            await page.locator('#game-request-submit').click();
            equal(await page.evaluate(() => document.activeElement.id), 'visitor-name');
            equal(await page.locator('#visitor-name').getAttribute('aria-invalid'), 'true');
            equal(await page.locator('#visitor-name-error').isVisible(), true);
        });
        await check(`${width}: Games selection, live counter and related-field validation`, async () => {
            await page.locator('[data-game="dota2"]').click();
            equal(await page.locator('#game-title').inputValue(), 'Dota 2');
            equal(await page.locator('#genre').inputValue(), 'moba');
            equal(await page.locator('[data-game="dota2"]').getAttribute('aria-pressed'), 'true');
            await page.locator('#visitor-name').fill(' Amir ');
            await page.locator('#visitor-email').fill('wrong');
            await page.locator('#visitor-phone').fill('+7 706 400 50 40');
            await page.locator('#visit-date').fill('2000-01-01');
            await page.locator('#team-yes').check();
            await page.locator('#game-agreement').check();
            await page.locator('#request-comment').fill('demo');
            assert.match(await page.locator('#game-comment-counter').innerText(), /4 \/ 1000/);
            await page.locator('#game-request-submit').click();
            equal(await page.locator('#visitor-email-error').isVisible(), true);
            equal(await page.locator('#visit-date-error').isVisible(), true);
            equal(await page.locator('#team-yes-error').isVisible(), true);
            await page.locator('#genre').selectOption('sports');
            equal(await page.locator('#genre-error').isVisible(), true);
            await page.locator('#genre').selectOption('moba');
        });
        await check(`${width}: Games valid summary, same reference on repeated submit, safe text`, async () => {
            await page.locator('#visitor-email').fill('amir@example.com');
            await page.locator('#visit-date').fill(await page.evaluate(() => window.TopGame.today()));
            await page.locator('#players').fill('2');
            await page.locator('#request-comment').fill('<img src=x onerror=alert(1)>');
            await page.locator('#game-request-submit').click();
            const first = await page.locator('#game-request-success').innerText();
            assert.match(first, /DEMO-GAME-/);
            assert.match(await page.locator('#game-request-list').innerText(), /amir@example.com/);
            assert.match(await page.locator('#game-request-list').innerText(), /<img src=x/);
            equal(await page.locator('#game-request-list img').count(), 0);
            await page.locator('#game-request-submit').click();
            equal(await page.locator('#game-request-success').innerText(), first);
            await page.locator('#request-comment').fill('Updated');
            equal(await page.locator('#game-request-success').isVisible(), false);
            await page.locator('#game-request-submit').click();
            assert.notEqual(await page.locator('#game-request-success').innerText(), first);
            await noOverflow(page);
        });
        if (width === 375 && process.env.QA_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.QA_SCREENSHOTS, 'games-phone.png'), fullPage: true });
        await check(`${width}: Game choice carries through to booking`, async () => {
            await page.locator('#games-a-2').click();
            equal(await page.locator('#player-count').inputValue(), '2');
            equal(await page.locator('#visit-date').count(), 0);
            assert.match(await page.locator('#booking-form').innerText(), /./);
            equal(await page.locator('textarea').inputValue(), 'Предпочтительная игра: Dota 2');
        });
        await page.goto(`${base}/games.html`);
        await check(`${width}: Games reset clears result, errors, counter and focus`, async () => {
            await page.locator('#visitor-name').fill('Amir');
            await page.locator('#request-comment').fill('abc');
            await page.locator('#game-request-reset').click();
            await page.waitForFunction(() => document.activeElement.id === 'visitor-name');
            equal(await page.locator('#visitor-name').inputValue(), '');
            equal(await page.locator('#game-request-list li').count(), 0);
            assert.match(await page.locator('#game-comment-counter').innerText(), /0 \/ 1000/);
        });
        await check(`${width}: no console, script or resource errors`, async () => equal(runtimeErrors.join('\n'), ''));
        await context.close();
        await browser.close();
        browser = null;
    }
})().catch(error => { report.errors.push(error.stack); }).finally(async () => {
    if (browser) await browser.close();
    server.close();
    report.passed = report.errors.length === 0;
    fs.writeFileSync(path.join(__dirname, 'games-rules-update.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks.length, passed: report.passed, errors: report.errors }));
    if (!report.passed) process.exitCode = 1;
});
