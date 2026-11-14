'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const origin = 'https://topgame.test';
const pages = ['index', 'prices', 'computers', 'booking', 'games', 'rules', 'about'];
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png'
};
const compact = value => value.replace(/\s/g, '');
const matchingPrice = (value, amount) => assert.ok(compact(value).includes(String(amount)), value);

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    const missing = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) {
        missing.push(url.href);
        return route.abort();
      }
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep)) return route.abort();
      try {
        await fs.access(file);
        return route.fulfill({ path: file, contentType: mime[path.extname(file)] });
      } catch {
        missing.push(url.pathname);
        return route.fulfill({ status: 404 });
      }
    });
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));

    const page = await context.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of pages) {
        await page.goto(origin + '/' + name + '.html');
        await page.locator('#nav-cart').waitFor({ state: 'attached' });
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, name + ' at ' + width);
      }
    }
    console.log('PASS Seven pages load at desktop and mobile widths without external requests');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin + '/prices.html');
    await page.locator('#prices-tariff-rows tr').first().waitFor();
    assert.equal(await page.locator('#prices-tariff-rows tr').count(), 9);
    matchingPrice(await page.locator('#prices-example-total').textContent(), 2400);
    await page.getByRole('link', { name: '5 часов', exact: true }).click();
    await page.locator('#seat-1').waitFor();
    assert.equal(await page.locator('#booking-tariff').inputValue(), 'five-hours');
    assert.equal(await page.locator('#booking-duration').inputValue(), '5');
    assert.match(await page.locator('#seat-1').textContent(), /Без времени/);
    await page.locator('#booking-tariff').selectOption('hour');
    assert.equal(await page.locator('#booking-duration').inputValue(), '1');
    console.log('PASS Prices, tariff links and hourly duration');

    const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await page.locator('#booking-date').fill(futureDate);
    await page.locator('#booking-time').fill('13:00');
    await page.locator('#booking-tariff').selectOption('night-5');
    assert.equal(await page.locator('#booking-time').inputValue(), '23:00');
    await page.locator('#booking-time').fill('02:01');
    assert.match(await page.locator('#booking-time-note').textContent(), /23:00–07:00/);
    await page.locator('#booking-time').fill('02:00');
    assert.equal(await page.locator('#seat-16').isDisabled(), true);
    await page.locator('#seat-1').click();
    await page.locator('#customer-name').fill('Тест Игрок');
    await page.locator('#customer-phone').fill('+7 700 123 45 67');
    await page.locator('#booking-agreement').check();
    await page.locator('#booking-submit').click();
    assert.equal(await page.locator('#booking-tab-food').getAttribute('aria-selected'), 'true');
    await page.locator('[data-add-food="water"]').click();
    await page.locator('#booking-food [data-booking-next]').first().click();
    matchingPrice(await page.locator('#booking-combined-total').textContent(), 4025);
    await page.locator('#booking-visit').selectOption('');
    matchingPrice(await page.locator('#booking-combined-total').textContent(), 525);
    const currentId = await page.locator('#booking-visit option').nth(1).getAttribute('value');
    await page.locator('#booking-visit').selectOption(currentId);
    matchingPrice(await page.locator('#booking-combined-total').textContent(), 4025);
    await page.goto(origin + '/index.html');
    await page.locator('#nav-cart').click();
    assert.match(await page.locator('#food-cart section').textContent(), /ПК 1/);
    await page.locator('#food-cart-close').click();
    console.log('PASS Night package validation, booking sequence, cart and selected visit');

    await page.setViewportSize({ width: 390, height: 600 });
    await page.evaluate(() => {
      localStorage.setItem('topgame-cart', JSON.stringify(
        ['burger', 'sandwich', 'fries', 'chips', 'cola', 'water', 'tea'].map(id => ({ id, quantity: 1 }))
      ));
    });
    await page.goto(origin + '/booking.html#booking-total-panel');
    await page.locator('#booking-total-panel [data-food-cart-open]').click();
    const cartBody = page.locator('#food-cart');
    const closeCart = page.locator('#food-cart-close');
    const beforeScroll = await closeCart.boundingBox();
    const scrollTop = await cartBody.evaluate(node => {
      node.scrollTop = node.scrollHeight;
      return node.scrollTop;
    });
    assert.ok(scrollTop > 0);
    assert.deepEqual(await closeCart.boundingBox(), beforeScroll);
    await closeCart.click();
    assert.equal(await page.locator('#food-cart-dialog').isHidden(), true);
    await page.evaluate(() => localStorage.setItem('topgame-cart', JSON.stringify([{ id: 'water', quantity: 1 }])));
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log('PASS Cart scroll keeps Close visible on mobile');

    await page.evaluate(() => {
      const date = '2000-01-01';
      const start = Date.parse(date + 'T18:00:00+05:00');
      localStorage.setItem('topgame-bookings', JSON.stringify([
        { id: 'past', date, time: '18:00', start, end: start + 3600000, tariff: 'hour', duration: 1, seats: [1], amount: 1200 }
      ]));
      localStorage.removeItem('topgame-booking-visit');
    });
    await page.reload();
    await page.locator('#local-bookings').waitFor();
    assert.match(await page.locator('#local-bookings').textContent(), /Время визита прошло/);
    assert.equal(await page.locator('#booking-visit-choice').isHidden(), true);
    assert.equal(compact(await page.locator('#booking-combined-total').textContent()), '525₸');
    assert.equal(await page.locator('#food-cart section').evaluate(node => node.hidden), true);
    console.log('PASS Past bookings remain in history and stay out of the food total');

    await page.goto(origin + '/games.html');
    const other = await context.newPage();
    await other.goto(origin + '/games.html');
    const cs = '[data-favorite-game="cs2"]';
    const dota = '[data-favorite-game="dota2"]';
    await page.locator(cs).click();
    await other.locator(cs + '[aria-pressed="true"]').waitFor();
    await other.locator(dota).click();
    await page.locator(dota + '[aria-pressed="true"]').waitFor();
    assert.equal(await page.locator(cs).getAttribute('aria-pressed'), 'true');
    await page.locator('#games-favorites').selectOption('favorites');
    assert.equal(await page.locator('#game-cards article').count(), 2);
    console.log('PASS Favorites stay in sync between tabs');

    await page.goto(origin + '/rules.html');
    await page.locator('#departure-checklist summary').click();
    await page.locator('#departure-list input').first().check();
    await page.reload();
    await page.locator('#departure-checklist summary').click();
    assert.equal(await page.locator('#departure-list input').first().isChecked(), true);
    await page.locator('#departure-reset').click();
    assert.equal(await page.locator('#departure-list input:checked').count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log('PASS Rules checklist restores and resets without errors');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
