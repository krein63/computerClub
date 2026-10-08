'use strict';

// Run with the bundled Node executable. This script lives outside the project.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = path.resolve(__dirname, '..');
const evidence = process.env.QA_OUTPUT || path.join(repo, 'checks', 'generated');
const pages = ['index.html', 'prices.html', 'computers.html', 'booking.html', 'games.html', 'rules.html', 'about.html'];
const widths = [375, 768, 1440];
const report = { baseline: {}, static: {}, layouts: [], flows: [], errors: [] };
fs.mkdirSync(evidence, { recursive: true });

function git(...args) {
  return cp.execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function check(name, condition, details = null) {
  report.flows.push({ name, ok: Boolean(condition), details });
  if (!condition) report.errors.push(name);
}

function getStaticChecks() {
  report.baseline.testedAt = new Date().toISOString();
  const sourceFiles = [...pages, ...fs.readdirSync(path.join(repo, 'js')).filter((file) => file.endsWith('.js')).map((file) => `js/${file}`), 'css/base.css', 'css/bootstrap.min.css'];
  report.baseline.sourceSha256 = Object.fromEntries(sourceFiles.map((file) => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, file))).digest('hex')]));
  report.baseline.tags = git('tag', '-n').trim().split('\n');
  report.baseline.midterm = git('rev-parse', 'midterm').trim();
  report.baseline.head = git('rev-parse', 'HEAD').trim();
  report.baseline.cssUnchanged = git('diff', 'midterm', '--', 'css').trim() === '';
  report.baseline.htmlFreeze = pages.map((file) => {
    const baseline = git('show', `midterm:${file}`);
    const current = fs.readFileSync(path.join(repo, file), 'utf8');
    const additions = [...current.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map((match) => match[0]);
    const stripped = current.replace(/^[ \t]*<script\b[^>]*>[\s\S]*?<\/script>[ \t]*\r?\n?/gim, '');
    return { file, unchangedExceptScripts: stripped === baseline, scripts: additions, validScripts: additions.every((script) => /^<script\b(?=[^>]*\bdefer\b)(?=[^>]*\bsrc=["']js\/)[^>]*>\s*<\/script>$/i.test(script)) };
  });
  if (!report.baseline.cssUnchanged) report.errors.push('CSS freeze changed');
  report.baseline.htmlFreeze.forEach((entry) => { if (!entry.unchangedExceptScripts || !entry.validScripts) report.errors.push(`HTML freeze: ${entry.file}`); });
  const missing = [];
  const ids = new Map(pages.map((file) => [file, new Set([...fs.readFileSync(path.join(repo, file), 'utf8').matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]))]));
  for (const file of pages) {
    const text = fs.readFileSync(path.join(repo, file), 'utf8');
    for (const match of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
      const reference = match[1];
      if (/^(?:https?:|tel:|mailto:|data:|javascript:)/i.test(reference)) continue;
      const [local, hash] = reference.split('#');
      const target = path.resolve(repo, decodeURIComponent(local || file));
      if (!fs.existsSync(target)) missing.push({ file, reference, reason: 'Missing local file' });
      else if (hash && target.endsWith('.html') && ids.has(path.basename(target)) && !ids.get(path.basename(target)).has(decodeURIComponent(hash))) {
        missing.push({ file, reference, reason: 'Fragment absent in baseline; browser will check DOM additions' });
      }
    }
  }
  report.static.localReferences = missing;
  for (const problem of missing.filter((entry) => entry.reason === 'Missing local file')) report.errors.push(`Missing reference ${problem.file}: ${problem.reference}`);
}

function futureDate(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

async function has(page, selector) { return await page.locator(selector).count() > 0; }

async function loadLazyImages(page) {
  for (const image of await page.locator('img[loading="lazy"]').all()) {
    if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
  }
  await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 5000 });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function fillBooking(page) {
  await page.locator('#customer-name').fill('QA Visitor');
  await page.locator('#customer-email').fill('qa@example.com');
  await page.locator('#customer-phone').fill('+7 700 123 45 67');
  await page.locator('#booking-date').fill(futureDate());
  await page.locator('#booking-time').fill('14:00');
  await page.locator('#player-count').fill('1');
  await page.locator('#booking-tariff').selectOption('hour');
  await page.locator('#zone-main').check();
  if (await has(page, '#booking-duration')) await page.locator('#booking-duration').fill('2');
  await page.locator('#booking-agreement').check();
}

async function bookingFlow(page) {
  await page.goto(pathToFileURL(path.join(repo, 'booking.html')).href);
  check('booking map exists', await has(page, '#seat-map'));
  if (!await has(page, '#seat-map')) return;
  check('20 booking seats rendered', await page.locator('[data-seat-id]').count() === 20);
  check('Main10 Duo5 Private5 map distribution', await page.locator('[data-seat-id][data-zone="main"]').count() === 10 && await page.locator('[data-seat-id][data-zone="duo"]').count() === 5 && await page.locator('[data-seat-id][data-zone="private"]').count() === 5);
  check('5 occupied illustrative seats disabled', await page.locator('[data-seat-state="occupied"]').count() === 5 && await page.locator('#seat-3').isDisabled());
  await page.locator('#seat-map').screenshot({ path: path.join(evidence, 'seat-map-1440.png') });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.locator('#seat-map').screenshot({ path: path.join(evidence, 'seat-map-375.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#booking-submit').click();
  check('booking empty validation shown', await page.locator('#booking-errors').isVisible());
  check('booking invalid input focused', await page.evaluate(() => document.activeElement.id) === 'customer-name');
  await fillBooking(page);
  const seat = page.locator('[data-seat-state="available"]').first();
  const seatId = await seat.getAttribute('data-seat-id');
  await seat.focus();
  await seat.press('Enter');
  check('keyboard seat selection updates state', await page.locator(`[data-seat-id="${seatId}"]`).getAttribute('data-seat-state') === 'selected');
  check('booking summary includes seat', (await page.locator('#booking-summary-seats').innerText()).includes(seatId));
  check('live booking total computed', /\d/.test(await page.locator('#booking-total').innerText()));
  await page.locator('#booking-submit').click();
  check('booking success visible', await page.locator('#booking-success').isVisible());
  const success = await page.locator('#booking-success').innerText();
  check('booking demonstration wording', /демо|демонстрац/i.test(success));
  check('booking reservation disables occupied seat', await page.locator(`[data-seat-id="${seatId}"]`).isDisabled());
  await page.locator('#booking-submit').click();
  check('repeated booking preserves confirmation', await page.locator('#booking-success').innerText() === success);
  await page.screenshot({ path: path.join(evidence, 'booking-success-1440.png'), fullPage: true });
  if (await has(page, '[data-cancel-booking]')) {
    await page.locator('[data-cancel-booking]').first().click();
    check('booking cancellation releases seat', !await page.locator(`[data-seat-id="${seatId}"]`).isDisabled());
    check('booking cancellation restores keyboard focus', await page.evaluate(() => document.activeElement.id) === 'local-bookings-status');
  }
  await page.locator('#booking-reset').click();
  check('booking reset clears name', await page.locator('#customer-name').inputValue() === '');
  await fillBooking(page);
  await page.locator('#booking-date').fill('2000-01-01');
  await page.locator('#booking-submit').click();
  check('booking rejects past date', await page.locator('#booking-date').getAttribute('aria-invalid') === 'true' && /прош/i.test(await page.locator('#booking-date-error').innerText()) && !await page.locator('#booking-success').isVisible());
  await page.locator('#booking-date').fill(futureDate());
  await page.locator('#player-count').fill('1.5');
  await page.locator('#booking-submit').click();
  check('booking rejects fractional players', await page.locator('#player-count').getAttribute('aria-invalid') === 'true' && /целым/i.test(await page.locator('#player-count-error').innerText()));
  await page.locator('#player-count').fill('1');
  await page.locator('#zone-private').check();
  check('private seat16 selectable for future visit', await page.locator('#seat-16').getAttribute('data-zone') === 'private' && !await page.locator('#seat-16').isDisabled());
  await page.locator('#booking-submit').click();
  check('booking rejects private zone with hourly tariff', await page.locator('#booking-tariff').getAttribute('aria-invalid') === 'true' && /PRIVATE/.test(await page.locator('#booking-tariff-error').innerText()));
  await page.locator('#zone-main').check();
  await page.locator('#booking-tariff').selectOption('three-hours');
  check('3-hour tariff prefills duration', await page.locator('#booking-duration').inputValue() === '3');
  await page.locator('#booking-duration').fill('2');
  await page.locator('#booking-submit').click();
  check('booking rejects wrong 3-hour package duration', await page.locator('#booking-duration').getAttribute('aria-invalid') === 'true' && /ровно 3/.test(await page.locator('#booking-duration-error').innerText()));
  await page.locator('#booking-reset').click();
  await fillBooking(page);
  const today = await page.evaluate(() => window.TopGame.today());
  await page.locator('#booking-date').fill(today);
  await page.locator('#booking-time').fill('00:00');
  await page.locator('#booking-submit').click();
  check('booking rejects past time today', await page.locator('#booking-time').getAttribute('aria-invalid') === 'true' && /прошло/.test(await page.locator('#booking-time-error').innerText()));
  await page.locator('#booking-reset').click();
  await fillBooking(page);
  await page.locator('#seat-1').click();
  await page.locator('#booking-submit').click();
  const firstSuccess = await page.locator('#booking-success').innerText();
  check('first interval accepted', await page.locator('[data-cancel-booking]').count() === 1);
  await page.locator('#booking-time').fill('15:00');
  check('overlapping chosen seat marked occupied', await page.locator('#seat-1').isDisabled() && await page.locator('#seat-1').getAttribute('data-seat-state') === 'occupied');
  await page.locator('#booking-submit').click();
  check('overlapping booking rejected + preserves accepted request', await page.locator('#seat-map').getAttribute('aria-invalid') === 'true' && await page.locator('[data-cancel-booking]').count() === 1 && await page.locator('#booking-success').innerText() === firstSuccess);
  await page.locator('#booking-time').fill('16:00');
  check('adjacent interval releases same seat', !await page.locator('#seat-1').isDisabled());
  await page.locator('#booking-submit').click();
  check('adjacent interval accepted', await page.locator('[data-cancel-booking]').count() === 2);
  while (await page.locator('[data-cancel-booking]').count() > 0) await page.locator('[data-cancel-booking]').first().click();
  const queryDate = futureDate(5);
  await page.goto(`${pathToFileURL(path.join(repo, 'booking.html')).href}?date=${queryDate}&players=2&tariff=three-hours&game=Dota%202`);
  check('booking date query prefills', await page.locator('#booking-date').inputValue() === queryDate);
  check('booking related query choices prefill', await page.locator('#player-count').inputValue() === '2' && await page.locator('#booking-tariff').inputValue() === 'three-hours' && await page.locator('#booking-duration').inputValue() === '3' && /Dota 2/.test(await page.locator('#booking-comment').inputValue()));
}

async function gamesFlow(page) {
  await page.goto(pathToFileURL(path.join(repo, 'games.html')).href);
  check('game catalogue search exists', await has(page, '#games-search'));
  if (await has(page, '#games-search')) {
    await page.locator('#games-search').fill('zzzzzz_no_results');
    check('game search no-results count', /0/.test(await page.locator('#games-result-count').innerText()));
    await page.locator('#games-filter-reset').click();
    check('game search reset', await page.locator('#games-search').inputValue() === '');
    await page.locator('[data-game="dota2"]').click();
    check('game catalogue next action prefills title + genre', await page.locator('#game-title').inputValue() === 'Dota 2' && await page.locator('#genre').inputValue() === 'moba');
  }
  await page.locator('#game-request-submit').click();
  check('game request empty validation', await page.locator('#game-request-errors').isVisible());
  await page.locator('#visitor-name').fill('QA Visitor');
  await page.locator('#visitor-email').fill('qa@example.com');
  await page.locator('#visitor-phone').fill('+7 700 123 45 67');
  await page.locator('#visit-date').fill(futureDate());
  await page.locator('#players').fill('2');
  await page.locator('#game-title').fill('Counter-Strike 2');
  const genreOption = await page.locator('#genre option').evaluateAll((options) => options.find((option) => option.value !== '')?.value);
  await page.locator('#genre').selectOption(genreOption);
  await page.locator('#team-yes').check();
  await page.locator('#game-agreement').check();
  await page.locator('#players').fill('21');
  await page.locator('#game-request-submit').click();
  check('game request rejects over20 participants', await page.locator('#players').getAttribute('aria-invalid') === 'true' && /20/.test(await page.locator('#players-error').innerText()));
  await page.locator('#players').fill('1');
  await page.locator('#game-request-submit').click();
  check('game request rejects team + single player', await page.locator('#team-yes-error').isVisible());
  await page.locator('#players').fill('2');
  check('game request clears corrected dependent team error', !await page.locator('#team-yes-error').isVisible());
  await page.locator('#genre').selectOption('strategy');
  await page.locator('#game-request-submit').click();
  check('game request rejects known title genre mismatch', await page.locator('#genre-error').isVisible());
  await page.locator('#genre').selectOption('shooter');
  check('game request clears corrected genre error', !await page.locator('#genre-error').isVisible());
  await page.locator('#game-request-submit').click();
  check('game request successful summary', await page.locator('#game-request-success').isVisible());
  check('game request demo message', /демо|демонстрац/i.test(await page.locator('#game-request-success').innerText()));
  await page.locator('#game-request-reset').click();
  check('game request reset clears name', await page.locator('#visitor-name').inputValue() === '');
}

async function pageFlows(page) {
  await page.goto(pathToFileURL(path.join(repo, 'index.html')).href);
  check('home states20 computers', /20\s*(?:игров|компьютер|ПК)/i.test(await page.locator('main').innerText()) && !/45\s*(?:игров|компьютер|ПК)/i.test(await page.locator('main').innerText()));
  await page.goto(pathToFileURL(path.join(repo, 'prices.html')).href);
  if (await has(page, '#prices-search')) {
    await page.locator('#prices-search').fill('zzzzzz_no_results');
    check('prices no-results count', /0/.test(await page.locator('#prices-result-count').innerText()));
    await page.locator('#prices-filter-reset').click();
    check('prices reset', await page.locator('#prices-search').inputValue() === '');
    check('price calculator exists', await has(page, '#price-calculator-form'));
    await page.locator('#calculator-tariff').selectOption('hour');
    await page.locator('#calculator-players').fill('2');
    await page.locator('#calculator-hours').fill('3');
    check('price calculator summary updates', /2/.test(await page.locator('#calculator-summary').innerText()));
    check('price calculator arithmetic', /7\s*200/.test(await page.locator('#calculator-summary').innerText()));
    check('price calculator booking link preselects', (await page.locator('#calculator-booking-link').getAttribute('href')).includes('booking.html'));
    const next = await page.locator('#calculator-booking-link').getAttribute('href');
    await page.goto(new URL(next, page.url()).href);
    check('price calculator booking journey retains tariff players + duration', await page.locator('#booking-tariff').inputValue() === 'hour' && await page.locator('#player-count').inputValue() === '2' && await page.locator('#booking-duration').inputValue() === '3');
    await page.goto(pathToFileURL(path.join(repo, 'prices.html')).href);
    await page.locator('#calculator-players').fill('11');
    check('Main calculator respects10-seat capacity', /10/.test(await page.locator('#calculator-summary').innerText()) && await page.locator('#calculator-booking-link').isHidden());
    await page.locator('#calculator-players').fill('1');
    await page.locator('#calculator-hours').fill('13');
    check('price calculator rejects over-12-hour duration', /12/.test(await page.locator('#calculator-summary').innerText()) && await page.locator('#calculator-booking-link').isHidden());
    await page.locator('#calculator-tariff').selectOption('private');
    await page.locator('#calculator-players').fill('6');
    check('private calculator respects 5-seat capacity', /5/.test(await page.locator('#calculator-summary').innerText()) && await page.locator('#calculator-booking-link').isHidden());
  }
  await page.goto(pathToFileURL(path.join(repo, 'computers.html')).href);
  if (await has(page, '#equipment-search')) {
    await page.locator('#equipment-search').fill('zzzzzz_no_results');
    check('equipment no-results count', /0/.test(await page.locator('#equipment-result-count').innerText()));
    await page.locator('#equipment-filter-reset').click();
    await page.locator('#compare-main').check();
    await page.locator('#compare-duo').check();
    check('equipment compare result', /MAIN/i.test(await page.locator('#equipment-compare-result').innerText()) && /DUO/i.test(await page.locator('#equipment-compare-result').innerText()));
    await page.locator('#equipment-compare-clear').click();
    check('equipment compare clears', !await page.locator('#compare-main').isChecked() && !await page.locator('#compare-duo').isChecked());
    await page.locator('#compare-main').check();
    await page.locator('[data-remove-zone="main"]').focus();
    await page.locator('[data-remove-zone="main"]').press('Enter');
    check('remove last comparison restores keyboard focus + empty state', await page.evaluate(() => document.activeElement.id) === 'equipment-comparison-status' && /пуст/i.test(await page.locator('#equipment-compare-result').innerText()));
  }
  await page.goto(pathToFileURL(path.join(repo, 'about.html')).href);
  check('about states20 computers', /20\s*(?:игров|компьютер|ПК)/i.test(await page.locator('main').innerText()) && !/45\s*(?:игров|компьютер|ПК)/i.test(await page.locator('main').innerText()));
  if (await has(page, '#review-form')) {
    await page.locator('#review-submit').click();
    check('review invalid name focused', await page.evaluate(() => document.activeElement.id) === 'review-name');
    const before = await page.locator('#review-list').innerText();
    await page.locator('#review-name').fill('<b>QA Visitor</b>');
    await page.locator('#review-text').fill('short');
    await page.locator('#review-rating').selectOption('5');
    await page.locator('#review-submit').click();
    check('review rejects short content', await page.locator('#review-text-error').isVisible() && await page.evaluate(() => document.activeElement.id) === 'review-text');
    await page.locator('#review-text').fill('QA review: <script>window.__qaExecuted = true</script> comfortable equipment.');
    check('review character counter', /\d/.test(await page.locator('#review-counter').innerText()));
    await page.locator('#review-submit').click();
    const after = await page.locator('#review-list').innerText();
    check('review appended as card', after.includes('QA review:') && after !== before);
    check('review user content safe plain text', await page.locator('#review-list script').count() === 0 && await page.evaluate(() => window.__qaExecuted !== true));
    await page.reload();
    check('review persists reload with date + rating', /QA review:/.test(await page.locator('#review-list').innerText()) && await page.locator('#review-list time').count() === 1 && /5 из 5/.test(await page.locator('#review-list').innerText()));
    await page.locator('[data-remove-review]').first().click();
    check('remove last review has empty state + count', /0/.test(await page.locator('#review-result-count').innerText()) && /пока не добавлены/.test(await page.locator('#review-list').innerText()));
  }
}

async function foodFlow(page) {
  await page.goto(pathToFileURL(path.join(repo, 'booking.html')).href);
  check('food menu module loaded', await has(page, '#food-menu'));
  if (!await has(page, '#food-menu')) return;
  check('8 food products rendered', await page.locator('[data-food-id]').count() === 8);
  await loadLazyImages(page);
  check('8 food product photos loaded', await page.locator('[data-food-id] img').count() === 8 && await page.locator('[data-food-id] img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)));
  check('food-seat options match20 computers', await page.locator('#food-seat option').count() === 21);
  check('unavailable food disabled', await page.locator('[data-add-food="cookie"]').isDisabled());
  check('empty food checkout disabled', await page.locator('#food-checkout').isDisabled());
  await page.locator('#food-category').selectOption('drinks');
  await page.locator('#food-search').fill('чай');
  check('food connected category + search', await page.locator('[data-food-id]').count() === 1 && await page.locator('[data-food-id="tea"]').count() === 1);
  await page.locator('#food-search').fill('zzzzzz_no_results');
  check('food no-results count + empty message', /0/.test(await page.locator('#food-count').innerText()) && /ничего|не найден/i.test(await page.locator('#food-cards').innerText()));
  await page.locator('#food-reset').click();
  await loadLazyImages(page);
  check('food filters reset', await page.locator('#food-search').inputValue() === '' && await page.locator('[data-food-id]').count() === 8);
  await page.locator('#food-available').check();
  check('food availability filter', await page.locator('[data-food-id]').count() === 7);
  await page.locator('#food-sort').selectOption('price-asc');
  check('food price sort', await page.locator('[data-food-id]').first().getAttribute('data-food-id') === 'water');
  await page.locator('#food-reset').click();
  await loadLazyImages(page);
  await page.locator('[data-add-food="burger"]').focus();
  await page.locator('[data-add-food="burger"]').press('Enter');
  await page.locator('[data-add-food="cola"]').click();
  check('cart add totals', /2/.test(await page.locator('#food-cart-total').innerText()) && /2\s*400/.test(await page.locator('#food-cart-total').innerText()));
  check('food count preserved after add', /Найдено/.test(await page.locator('#food-count').innerText()));
  const increase = page.locator('[data-cart-action="increase"][data-item-id="burger"]');
  await increase.focus();
  await increase.press('Enter');
  check('cart increase recalculates total', /4\s*200/.test(await page.locator('#food-cart-total').innerText()));
  check('cart increase restores keyboard focus', await page.evaluate(() => document.activeElement.dataset.cartAction) === 'increase');
  await page.locator('[data-cart-action="decrease"][data-item-id="burger"]').click();
  check('cart decrease recalculates total', /2\s*400/.test(await page.locator('#food-cart-total').innerText()));
  await page.locator('[data-cart-action="remove"][data-item-id="cola"]').click();
  check('cart remove recalculates total', /1\s*800/.test(await page.locator('#food-cart-total').innerText()));
  await page.locator('[data-cart-action="remove"][data-item-id="burger"]').focus();
  await page.locator('[data-cart-action="remove"][data-item-id="burger"]').press('Enter');
  check('remove last cart item empty state', await page.locator('#food-checkout').isDisabled() && /пуст/i.test(await page.locator('#food-cart-items').innerText()));
  check('remove last item preserves keyboard focus', await page.evaluate(() => document.activeElement.tagName) !== 'BODY');
  await page.locator('[data-add-food="burger"]').click();
  await page.locator('[data-add-food="water"]').click();
  await page.locator('#food-checkout').click();
  check('food empty contact validation focuses name', await page.evaluate(() => document.activeElement.id) === 'food-name');
  await page.locator('#food-name').fill('<b>QA Visitor</b>');
  await page.locator('#food-email').fill('qa@example.com');
  await page.locator('#food-phone').fill('+7 700 123 45 67');
  await page.locator('#food-delivery').selectOption('seat');
  await page.locator('#food-agreement').check();
  await page.locator('#food-checkout').click();
  check('food delivery requires seat selection', await page.locator('#food-seat-error').isVisible());
  await page.locator('#food-seat').selectOption('1');
  check('food seat correction clears outdated error', !await page.locator('#food-seat-error').isVisible());
  await page.locator('#food-menu').screenshot({ path: path.join(evidence, 'food-menu-1440.png') });
  await page.locator('#food-cart').screenshot({ path: path.join(evidence, 'food-cart-1440.png') });
  await page.locator('#food-checkout').click();
  const success = await page.locator('#food-order-success').innerText();
  check('food demo order success summary', await page.locator('#food-order-success').isVisible() && /демо|демонстрац/i.test(success) && /2\s*150/.test(success) && /ПК 1/.test(success));
  check('food user content inserted as plain text', success.includes('<b>QA Visitor</b>') && await page.locator('#food-order-success b').count() === 0);
  check('food successful order clears cart', await page.locator('#food-checkout').isDisabled() && /пуст/i.test(await page.locator('#food-cart-items').innerText()));
  await page.screenshot({ path: path.join(evidence, 'food-success-1440.png'), fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.locator('#food-menu').screenshot({ path: path.join(evidence, 'food-menu-375.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-add-food="tea"]').click();
  await page.goto(pathToFileURL(path.join(repo, 'prices.html')).href);
  check('cart persists across page navigation', /1/.test(await page.locator('#nav-cart').innerText()));
  await page.goto(pathToFileURL(path.join(repo, 'booking.html')).href);
  await page.locator('#food-cart-clear').click();
  check('cart clear empties + disables checkout', await page.locator('#food-checkout').isDisabled() && /пуст/i.test(await page.locator('#food-cart-items').innerText()));
}

async function main() {
  getStaticChecks();
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Almaty' });
  for (const width of widths) {
    for (const file of pages) {
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const requestsFailed = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('requestfailed', (request) => requestsFailed.push({ url: request.url(), failure: request.failure()?.errorText }));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pathToFileURL(path.join(repo, file)).href, { waitUntil: 'load' });
      await loadLazyImages(page);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        unloadedImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute('src')),
        nestedParagraphs: document.querySelectorAll('p p').length,
        ids: [...document.querySelectorAll('[id]')].map((element) => element.id),
        localLinks: [...document.querySelectorAll('a[href]')].filter((anchor) => anchor.href.startsWith('file:')).map((anchor) => anchor.href),
        overflowing: [...document.querySelectorAll('body *')].filter((element) => { const r = element.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).slice(0, 10).map((element) => ({ tag: element.tagName, id: element.id, classes: element.className, right: element.getBoundingClientRect().right }))
      }));
      const entry = { file, width, ...dimensions, consoleErrors, pageErrors, requestsFailed };
      report.layouts.push(entry);
      if (dimensions.document > width + 1) report.errors.push(`Overflow ${file} ${width}: ${dimensions.document}`);
      if (dimensions.nestedParagraphs || new Set(dimensions.ids).size !== dimensions.ids.length) report.errors.push(`DOM structure ${file} ${width}`);
      if (dimensions.unloadedImages.length || consoleErrors.length || pageErrors.length || requestsFailed.length) report.errors.push(`Assets/console ${file} ${width}`);
      if (width < 1200) {
        await page.locator('label[for="main-navigation-toggle"]').click();
        check(`mobile menu ${file} ${width}`, await page.locator('#nav-booking').isVisible());
      }
      if (['booking.html', 'index.html'].includes(file)) await page.screenshot({ path: path.join(evidence, `${file.replace('.html', '')}-${width}.png`), fullPage: true });
      if (file === 'booking.html') await page.locator('#seat-map').screenshot({ path: path.join(evidence, `seat-map-${width}.png`) });
      await page.close();
    }
  }
  const renderedIds = new Map(report.layouts.filter((entry) => entry.width === 1440).map((entry) => [entry.file, new Set(entry.ids)]));
  report.static.renderedLocalReferences = [];
  for (const entry of report.layouts.filter((layout) => layout.width === 1440)) {
    for (const link of entry.localLinks) {
      const url = new URL(link);
      const targetFile = fileURLToPath(url);
      const relative = path.relative(repo, targetFile);
      if (!fs.existsSync(targetFile) || url.hash && renderedIds.has(relative) && !renderedIds.get(relative).has(decodeURIComponent(url.hash.slice(1)))) {
        report.static.renderedLocalReferences.push({ page: entry.file, link });
        report.errors.push(`Broken rendered local reference ${entry.file}: ${link}`);
      }
    }
  }
  const page = await context.newPage();
  page.on('console', (message) => { if (message.type() === 'error') report.errors.push(`Flow console: ${message.text()}`); });
  page.on('pageerror', (error) => report.errors.push(`Flow error: ${error.message}`));
  for (const flow of [bookingFlow, gamesFlow, pageFlows, foodFlow]) {
    try {
      await flow(page);
      check(`${flow.name} no nested paragraphs after validation`, await page.locator('p p').count() === 0);
    }
    catch (error) { check(flow.name, false, error.stack); }
  }
  await browser.close();
  fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ errors: report.errors, layouts: report.layouts.length, flowChecks: report.flows.length, failedChecks: report.flows.filter((entry) => !entry.ok), evidence }, null, 2));
  process.exitCode = report.errors.length ? 1 : 0;
}

main().catch((error) => {
  report.errors.push(error.stack);
  fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  console.error(error);
  process.exitCode = 1;
});
