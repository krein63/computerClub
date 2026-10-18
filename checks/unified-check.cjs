'use strict';

// Browser QA for the redesigned, unified PC/food checkout. Does not edit site files.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = process.env.QA_REPO || path.resolve(__dirname, '..');
const out = process.env.QA_OUTPUT || path.join(__dirname, 'generated-unified');
const report = { testedAt: new Date().toISOString(), sourceHashes: {}, checks: [], errors: [], browserErrors: [] };
const fixedNow = Date.parse('2030-06-15T07:15:00Z');
let browser;
let origin;

function check(name, pass, detail) {
  const result = { name, pass: Boolean(pass) };
  if (detail !== undefined) result.detail = detail;
  report.checks.push(result);
  if (!pass) report.errors.push(name);
}

function digits(text) { return Number(String(text).replace(/[^0-9]/g, '')); }
async function text(page, id) { return await page.locator(id).innerText(); }
async function activeStep(page) {
  for (let index = 0; index < 3; index++) {
    if (await page.locator('[data-step-panel="' + index + '"]').isVisible()) return index;
  }
  return -1;
}
async function setValue(page, id, value) {
  await page.locator(id).evaluate((element, next) => {
    element.value = next;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function visitTime(page, date = '2030-06-16', time = '14:00', hours = '2') {
  await setValue(page, '#booking-date', date);
  await setValue(page, '#booking-time', time);
  await setValue(page, '#booking-duration', hours);
}
async function step(page, number) {
  await page.locator('[data-step="' + number + '"]').click();
}
async function contacts(page, email = '') {
  await page.locator('#customer-name').fill('<b>QA Visitor</b>');
  await page.locator('#customer-email').fill(email);
  await page.locator('#customer-phone').fill('+7 700 123 45 67');
  await page.locator('#booking-agreement').check();
}
async function newContext(options = {}) {
  const { now = fixedNow, blockStorage = false, corruptStorage = false, ...browserOptions } = options;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Almaty', ...browserOptions });
  if (blockStorage) await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('QA: storage disabled'); } });
  });
  if (corruptStorage) await context.addInitScript(() => {
    localStorage.setItem('topgame-cart', '{broken');
    localStorage.setItem('topgame-bookings', '42');
    localStorage.setItem('topgame-orders', '{}');
    localStorage.setItem('topgame-visit-draft', '{"date":"invalid","seats":[null,999]}');
  });
  await context.addInitScript(({ now }) => {
    const OriginalDate = Date;
    class FrozenDate extends OriginalDate {
      constructor(...args) { if (args.length) super(...args); else super(now); }
      static now() { return now; }
    }
    window.Date = FrozenDate;
  }, { now });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', error => report.browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.browserErrors.push(message.text()); });
  await page.goto(origin + '/booking.html');
  return { context, page };
}
async function scenario(name, fn, options) {
  let context;
  try {
    const state = await newContext(options);
    context = state.context;
    await fn(state.page, state.context);
  } catch (error) {
    check(name + ' completed', false, error.message);
  } finally {
    if (context) await context.close();
  }
}

async function run() {
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((request, response) => {
    const local = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (local === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const target = path.join(repo, local === '/' ? 'index.html' : local);
    if (!target.startsWith(repo + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
    response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    fs.createReadStream(target).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined) });
  try {
    for (const file of ['booking.html', 'js/booking.js', 'js/food.js', 'js/main.js', 'css/base.css']) {
      report.sourceHashes[file] = crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex');
    }

    await scenario('PC journey', async page => {
      check('First visible step is PC choice', await activeStep(page) === 0);
      check('All 20 PCs are present', await page.locator('[data-seat-id]').count() === 20);
      check('Player number is derived, not separately editable', await page.locator('#player-count').evaluate(element => !element.matches('input, select, textarea, [contenteditable="true"]')));
      await visitTime(page);
      await page.locator('#seat-1').focus();
      await page.keyboard.press('Enter');
      await page.locator('#seat-2').click();
      check('Selecting two PCs updates player count', /2/.test(await text(page, '#player-count')));
      check('PC sum for 2 PCs × 2 hours equals 4800', digits(await text(page, '#cart-games-total')) === 4800);
      await page.locator('#booking-next').click();
      check('PC Continue opens food step', await activeStep(page) === 1);
      await page.locator('#booking-next').click();
      check('Food can be skipped', await activeStep(page) === 2);
      await contacts(page);
      await page.locator('#booking-back').click();
      await page.locator('#booking-back').click();
      check('Back retains PC selection', await page.locator('#seat-1').getAttribute('aria-pressed') === 'true');
      await step(page, 2);
      check('Back and forward retain contact input', await page.locator('#customer-name').inputValue() === '<b>QA Visitor</b>');
      await page.locator('#booking-submit').click();
      check('PC-only succeeds with optional email blank', await page.locator('#booking-success').isVisible());
      check('Success explains demo nature', /демо/i.test(await text(page, '#booking-success')));
      const stored = await page.evaluate(() => JSON.stringify(localStorage));
      check('Contacts are absent from localStorage', !stored.includes('QA Visitor') && !stored.includes('700 123'));
      const count = await page.locator('[data-cancel-booking]').count();
      check('Successful PC booking stored once', count === 1);
      if (await page.locator('#booking-submit').isVisible()) await page.locator('#booking-submit').click();
      check('Repeated submit creates no duplicate', await page.locator('[data-cancel-booking]').count() === 1);
      await page.screenshot({ path: path.join(out, 'flow-desktop-success.png'), fullPage: true });
      await page.reload();
      check('Booking survives page reload', await page.locator('[data-cancel-booking]').count() === 1);
      await visitTime(page);
      check('Saved booking marks overlapping PC busy', await page.locator('#seat-1').isDisabled());
      await setValue(page, '#booking-time', '16:00');
      check('Adjacent interval leaves PC available', !await page.locator('#seat-1').isDisabled());
      await setValue(page, '#booking-time', '15:00');
      check('Intersecting interval marks PC unavailable', await page.locator('#seat-1').isDisabled());
      await page.locator('details:has(#local-bookings) > summary').click();
      await page.locator('[data-cancel-booking]').first().click();
      check('Cancellation frees the PC', !await page.locator('#seat-1').isDisabled());
      await page.reload();
      check('Cancellation survives reload', await page.locator('[data-cancel-booking]').count() === 0);
    });

    await scenario('Food and unified cart', async page => {
      await visitTime(page);
      await page.locator('#seat-1').click();
      await page.locator('#booking-next').click();
      await page.locator('[data-add-food="burger"]').click();
      await page.locator('[data-add-food="water"]').click();
      check('Food total equals menu prices', digits(await text(page, '#cart-food-total')) === 3225);
      check('Unified total equals PCs plus food', digits(await text(page, '#cart-total')) === 5625);
      const increase = page.locator('#cart-food-items [data-food-action="increase"][data-food-id="burger"]');
      await increase.focus(); await page.keyboard.press('Enter');
      check('Cart plus updates total', digits(await text(page, '#cart-food-total')) === 5925);
      check('Cart plus preserves keyboard focus', await page.evaluate(() => document.activeElement.dataset.foodAction) === 'increase');
      await page.locator('#cart-food-items [data-food-action="decrease"][data-food-id="burger"]').click();
      check('Cart minus updates total', digits(await text(page, '#cart-food-total')) === 3225);
      await page.locator('#booking-next').click();
      await contacts(page, 'qa@example.com');
      await page.locator('#food-delivery').selectOption('seat');
      check('Delivery choices only contain chosen PCs', await page.locator('#food-seat option[value="1"]').count() === 1 && await page.locator('#food-seat option[value="2"]').count() === 0);
      await page.locator('#food-seat').selectOption('1');
      await page.locator('#booking-submit').click();
      check('Combined PC and food order succeeds', await page.locator('#booking-success').isVisible());
      const summary = await text(page, '#booking-success');
      check('Combined success contains food and PC', /бургер/i.test(summary) && /PC\s*0?1|ПК\s*0?1/i.test(summary));
      check('Contact markup is rendered as plain text', summary.includes('<b>QA Visitor</b>') && await page.locator('#booking-success b').count() === 0);
      check('Successful order clears food cart', (await page.evaluate(() => window.TopGameFood.getCart())).length === 0);
    });

    await scenario('Food-only mode', async page => {
      await page.locator('#food-only-button').click();
      check('Food-only opens the menu', await activeStep(page) === 1);
      await page.locator('[data-add-food="tea"]').click();
      await page.locator('#booking-next').click();
      await contacts(page);
      await page.locator('#food-delivery').selectOption('bar');
      await page.locator('#booking-submit').click();
      check('Food-only bar pickup succeeds without PC', await page.locator('#booking-success').isVisible());
      check('Food-only does not reserve any PC', await page.locator('[data-cancel-booking]').count() === 0);
    });

    await scenario('Tariff consistency', async page => {
      await visitTime(page);
      await page.locator('[data-tariff-pick="three-hours"]').click();
      check('Three-hour package fixes duration to 3', await page.locator('#booking-duration').inputValue() === '3');
      await page.locator('#seat-1').click();
      check('Three-hour package total is 3600 per PC', digits(await text(page, '#cart-games-total')) === 3600);
      await page.locator('[data-tariff-pick="private"]').click();
      check('PRIVATE tariff selects PRIVATE zone', await page.locator('[data-zone-pick="private"]').getAttribute('aria-pressed') === 'true' && await page.locator('[data-zone-map="private"]').isVisible());
      await page.locator('[data-zone-pick="main"]').click();
      check('Leaving PRIVATE selects hourly tariff', await page.locator('#booking-tariff').inputValue() === 'hour');
    });

    await scenario('Private order with unknown group price', async page => {
      await visitTime(page);
      await page.locator('[data-tariff-pick="private"]').click();
      await page.locator('#seat-16').click();
      check('Private total remains explicitly unknown', await text(page, '#cart-total') === 'Уточняется');
      await page.locator('#booking-next').click();
      await page.locator('#booking-next').click();
      await contacts(page);
      await page.locator('#booking-submit').click();
      check('Private submission explains that price needs confirmation', await page.locator('#booking-success').isVisible() && /Стоимость Private уточняется/.test(await text(page, '#booking-success')));
    });

    await scenario('Duo requires two PCs', async page => {
      await visitTime(page);
      await page.locator('[data-zone-pick="duo"]').click();
      await page.locator('#seat-11').click();
      await page.locator('#booking-next').click();
      check('One Duo PC cannot advance', await activeStep(page) === 0 && /ровно два/.test(await text(page, '#booking-step-error')));
      await page.locator('#seat-13').click();
      await page.locator('#booking-next').click();
      await page.locator('#booking-next').click();
      await contacts(page);
      await page.locator('#booking-submit').click();
      check('Two Duo PCs submit successfully', await page.locator('#booking-success').isVisible() && /PC 11, PC 13/.test(await text(page, '#booking-success')));
    });

    await scenario('Food-only delivery to an existing PC', async page => {
      await page.locator('#food-only-button').click();
      await page.locator('[data-add-food="tea"]').click();
      await page.locator('#booking-next').click();
      await contacts(page);
      await page.locator('#booking-submit').click();
      check('Seat delivery requires a PC even without a booking', await page.locator('#food-seat').getAttribute('aria-invalid') === 'true' && await page.evaluate(() => document.activeElement.id) === 'food-seat');
      await page.locator('#food-seat').selectOption('7');
      await page.locator('#booking-submit').click();
      check('Food-only delivery to an existing PC succeeds', await page.locator('#booking-success').isVisible() && /Еду принести к PC 7/.test(await text(page, '#booking-success')));
      check('Food delivery does not create a PC reservation', await page.locator('[data-cancel-booking]').count() === 0 && await page.locator('[data-cancel-order]').count() === 1);
    });

    await scenario('Validation and contacts once', async page => {
      await page.locator('#booking-next').click();
      check('Cannot proceed without a PC', await activeStep(page) === 0);
      await visitTime(page, '2020-01-01', '14:00');
      await page.locator('#seat-1').click();
      await page.locator('#booking-next').click();
      check('Past date prevents moving ahead', await activeStep(page) === 0);
      await visitTime(page);
      await page.locator('#booking-next').click();
      await page.locator('#booking-next').click();
      await page.locator('#booking-submit').click();
      check('Invalid contact gets focus', await page.evaluate(() => document.activeElement.id) === 'customer-name');
      check('Only one name input in checkout', await page.locator('#customer-name').count() === 1 && await page.locator('#food-name').count() === 0);
    });

    for (const width of [375, 768, 1440]) {
      await scenario('Layout ' + width, async page => {
        check('No initial horizontal overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        await page.screenshot({ path: path.join(out, 'flow-booking-' + width + '.png'), fullPage: true });
        await visitTime(page);
        await page.locator('#seat-1').click();
        await page.locator('#booking-next').click();
        await page.locator('[data-add-food="burger"]').click();
        check('No menu horizontal overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        await page.screenshot({ path: path.join(out, 'flow-menu-' + width + '.png'), fullPage: true });
        if (width < 1024) {
          await page.locator('#cart-open').click();
          check('Cart uses an open native modal at ' + width, await page.locator('#cart-dialog').evaluate(element => element.tagName === 'DIALOG' && element.open && element.matches(':modal')));
          check('Mobile cart has no overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
          await page.screenshot({ path: path.join(out, 'flow-cart-' + width + '.png') });
          await page.keyboard.press('Escape');
          check('Escape closes cart dialog at ' + width, !await page.locator('#cart-dialog').evaluate(element => element.open));
          check('Escape returns focus to opener at ' + width, await page.evaluate(() => document.activeElement.id) === 'cart-open');
        }
      }, { viewport: { width, height: 900 } });
    }

    await scenario('Foreign browser time zone near midnight', async page => {
      const date = await page.locator('#booking-date').inputValue();
      const time = await page.locator('#booking-time').inputValue();
      check('Default is future in Almaty at 23:45', Date.parse(date + 'T' + time + ':00+05:00') > Date.parse('2030-06-15T18:45:00Z'), { date, time });
      check('Near midnight default rolls over to next Almaty day', date === '2030-06-16');
    }, { timezoneId: 'America/Los_Angeles', now: Date.parse('2030-06-15T18:45:00Z') });

    await scenario('Draft excludes personal contacts', async page => {
      await visitTime(page);
      await page.locator('#seat-1').click();
      await page.locator('#booking-next').click();
      await page.locator('[data-add-food="cola"]').click();
      await page.locator('#booking-next').click();
      await contacts(page);
      await page.reload();
      check('Draft restores selected PC', await page.locator('#seat-1').getAttribute('aria-pressed') === 'true');
      check('Draft restores food cart', (await page.evaluate(() => window.TopGameFood.getCart())).some(line => line.id === 'cola'));
      await step(page, 2);
      check('Reload does not restore personal contact', await page.locator('#customer-name').inputValue() === '');
    });

    await scenario('Remove selected PC from unified cart', async page => {
      await visitTime(page);
      await page.locator('#seat-1').click();
      await page.locator('#seat-2').click();
      await page.locator('[data-remove-seat="1"]').click();
      check('Removing a PC updates count and total', /1/.test(await text(page, '#player-count')) && digits(await text(page, '#cart-games-total')) === 2400);
      await page.locator('[data-remove-seat="2"]').click();
      check('Removing last PC shows empty cart', await page.locator('#cart-empty').isVisible());
      check('Removing last PC restores a useful focus', await page.evaluate(() => document.activeElement.id) === 'cart-title');
    });

    await scenario('Actions in mobile cart dialog', async page => {
      await visitTime(page);
      await page.locator('#seat-1').click();
      await page.locator('#seat-2').click();
      await page.locator('#booking-next').click();
      await page.locator('[data-add-food="burger"]').click();
      await page.locator('#cart-open').click();
      await page.locator('#cart-burger-increase').focus();
      await page.keyboard.press('Enter');
      check('Mobile cart plus updates quantity and preserves focus', await page.locator('#cart-food-items .quantity-value').innerText() === '2' && await page.evaluate(() => document.activeElement.id) === 'cart-burger-increase');
      await page.locator('#cart-burger-decrease').click();
      check('Mobile cart minus updates quantity and preserves focus', await page.locator('#cart-food-items .quantity-value').innerText() === '1' && await page.evaluate(() => document.activeElement.id) === 'cart-burger-decrease');
      await page.locator('[data-remove-seat="1"]').click();
      check('Mobile cart PC removal recalculates price and focuses next PC', digits(await text(page, '#cart-games-total')) === 2400 && await page.evaluate(() => document.activeElement.dataset.removeSeat) === '2');
      await page.locator('[data-remove-seat="2"]').click();
      check('Mobile cart last PC removal keeps food and useful focus', digits(await text(page, '#cart-total')) === 2700 && await page.evaluate(() => document.activeElement.id) === 'cart-title' && await page.locator('#cart-dialog').evaluate(element => element.open));
      await page.keyboard.press('Escape');
      check('Adding PCs remains available after removing all PCs', await page.locator('#choose-pc-button').isVisible());
    }, { viewport: { width: 375, height: 900 } });

    await scenario('Corrupted storage', async page => {
      check('Malformed saved data does not prevent checkout', await activeStep(page) === 0 && await page.locator('#seat-1').isEnabled());
      check('Malformed saved cart is safely empty', (await page.evaluate(() => window.TopGameFood.getCart())).length === 0);
    }, { corruptStorage: true });

    await scenario('Structurally invalid saved data and zone URL', async page => {
      await page.evaluate(() => {
        const start = Date.parse('2030-06-16T14:00:00+05:00');
        const booking = { id: 'valid-booking', zone: 'main', tariff: 'hour', date: '2030-06-16', time: '14:00', duration: 2, start, end: start + 7200000, seats: [1], items: [] };
        localStorage.setItem('topgame-bookings', JSON.stringify([
          null, 42, { ...booking, id: 'duplicate-seat', seats: [2, 2] },
          { ...booking, id: 'bad-time', start: start + 1 },
          { ...booking, id: 'bad-tariff', tariff: 'missing' },
          { ...booking, id: 'bad-date', date: '2030-02-31' }, booking
        ]));
        localStorage.setItem('topgame-orders', JSON.stringify([
          null, { id: 'bad-line', items: [null] },
          { id: 'bad-product', items: [{ id: 'missing', quantity: 1 }] },
          { id: 'bad-quantity', items: [{ id: 'tea', quantity: 21 }] },
          { id: 'valid-food', items: [{ id: 'tea', quantity: 1 }] }
        ]));
        localStorage.setItem('topgame-visit-draft', JSON.stringify({ ...booking, zone: 'constructor', seats: [2], step: 2 }));
      });
      await page.reload();
      check('Only structurally valid stored orders are restored', await page.locator('[data-cancel-booking]').count() === 1 && await page.locator('[data-cancel-order]').count() === 1);
      check('Invalid zone draft leaves Main visible', await page.locator('[data-zone-map="main"]').isVisible());
      await visitTime(page);
      check('Only valid saved booking affects PC availability', await page.locator('#seat-1').isDisabled() && await page.locator('#seat-2').isEnabled());
      await page.goto(origin + '/booking.html?zone=constructor');
      check('Inherited object key in URL cannot replace Main zone', await page.locator('[data-zone-pick="main"]').getAttribute('aria-pressed') === 'true' && await page.locator('[data-zone-map="main"]').isVisible());
    });

    await scenario('Storage disabled', async page => {
      await visitTime(page);
      await page.locator('#seat-1').click();
      await page.locator('#booking-next').click();
      await page.locator('#booking-next').click();
      await contacts(page);
      await page.locator('#booking-submit').click();
      check('Storage disabled still accepts in-memory demo', await page.locator('#booking-success').isVisible());
      check('Storage disabled is explained clearly', /до перезагрузки|запретил/i.test(await text(page, '#booking-storage-note')));
      await page.locator('details:has(#local-bookings) > summary').click();
      await page.locator('[data-cancel-booking]').first().click();
      check('In-memory booking can be cancelled', await page.locator('[data-cancel-booking]').count() === 0);
    }, { blockStorage: true });

    await scenario('Cross-tab synchronisation', async (page, context) => {
      await visitTime(page);
      await page.locator('#seat-1').click();
      const second = await context.newPage();
      await second.goto(origin + '/booking.html');
      await visitTime(second);
      await page.locator('#booking-next').click();
      await page.locator('[data-add-food="water"]').click();
      await second.waitForFunction(() => window.TopGameFood.getCart().length === 1);
      check('Food cart syncs into another open tab', (await second.evaluate(() => window.TopGameFood.getCart()))[0].id === 'water');
      await page.locator('#booking-next').click();
      await contacts(page);
      await page.locator('#booking-submit').click();
      await second.waitForFunction(() => document.getElementById('seat-1').disabled);
      check('New booking updates occupancy in another open tab', await second.locator('#seat-1').isDisabled());
      check('Completed checkout clears food in another tab', (await second.evaluate(() => window.TopGameFood.getCart())).length === 0);
      await second.locator('details:has(#local-bookings) > summary').click();
      await second.locator('[data-cancel-booking]').first().click();
      await page.waitForFunction(() => document.querySelectorAll('[data-cancel-booking]').length === 0);
      check('Cancellation syncs into originating tab', await page.locator('[data-cancel-booking]').count() === 0);
      await second.close();
    });

    await scenario('Other page integration', async page => {
      for (const file of ['index.html', 'prices.html', 'computers.html', 'games.html', 'rules.html', 'about.html']) {
        await page.goto(origin + '/' + file);
        for (const width of [375, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          check(file + ' has no overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        }
        const duplicates = await page.evaluate(() => {
          const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
          return ids.filter((id, index) => ids.indexOf(id) !== index);
        });
        check(file + ' has unique HTML ids', duplicates.length === 0, duplicates);
      }
    });

    check('Browser has no uncaught JS errors', report.browserErrors.length === 0, report.browserErrors);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'new-flows-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks.length, failures: report.errors, browserErrors: report.browserErrors, report: path.join(out, 'new-flows-report.json') }, null, 2));
  }
  process.exitCode = report.errors.length ? 1 : 0;
}
run().catch(error => { console.error(error); process.exitCode = 1; });
