'use strict';

// Browser verification only; this file is not loaded by the website.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const repo = process.env.QA_REPO || path.resolve(__dirname, '..');
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
  await page.evaluate(() => localStorage.removeItem('topgame-bookings'));
  await page.reload();
  check('20 booking seats rendered', await page.locator('[data-seat-id]').count() === 20);
  check('Main10 Duo5 Private5 distribution', await page.locator('[data-zone="main"][data-seat-id]').count() === 10 && await page.locator('[data-zone="duo"][data-seat-id]').count() === 5 && await page.locator('[data-zone="private"][data-seat-id]').count() === 5);
  check('no fictitious occupied seats in clean browser', await page.locator('[data-seat-state="occupied"]').count() === 0);
  await page.locator('#booking-submit').click();
  check('booking empty validation shown', await page.locator('#booking-errors').isVisible());
  check('booking invalid contact focused', await page.evaluate(() => document.activeElement.id) === 'customer-name');
  await fillBooking(page);
  const tariffIds = await page.locator('#booking-tariff option').evaluateAll(options => options.map(option => option.value).filter(Boolean));
  check('six booking tariff options', JSON.stringify(tariffIds) === JSON.stringify(['hour','three-hours','five-hours','day','night','private']), tariffIds);
  await page.locator('#seat-11').focus();
  await page.locator('#seat-11').press('Enter');
  check('one DUO computer can be selected', await page.locator('#seat-11').getAttribute('data-seat-state') === 'selected' && await page.locator('#player-count').inputValue() === '1');
  await page.locator('#booking-submit').click();
  check('one DUO computer accepted with hourly tariff', await page.locator('#booking-success').isVisible() && await page.locator('[data-cancel-booking]').count() === 1);
  await page.locator('[data-cancel-booking]').click();
  check('cancel frees selected DUO seat', !await page.locator('#seat-11').isDisabled());
  check('cancel restores focus', await page.evaluate(() => document.activeElement.id) === 'local-bookings-status');
  await page.locator('#booking-reset').click();
  await fillBooking(page);
  await page.locator('#seat-1').click();
  await page.locator('#seat-11').click();
  await page.locator('#seat-16').click();
  check('mixed-zone selection counts3', await page.locator('[data-seat-state="selected"]').count() === 3 && await page.locator('#player-count').inputValue() === '3');
  await page.locator('#zone-duo').check();
  check('zone radio preserves mixed-zone selection', await page.locator('[data-seat-state="selected"]').count() === 3 && await page.locator('#player-count').inputValue() === '3');
  check('mixed-zone summary correct', /MAIN/.test(await page.locator('#booking-summary-zone').innerText()) && /DUO/.test(await page.locator('#booking-summary-zone').innerText()) && /PRIVATE/.test(await page.locator('#booking-summary-zone').innerText()));
  await page.locator('#booking-submit').click();
  check('mixed-zone booking accepted', await page.locator('[data-cancel-booking]').count() === 1 && /MAIN/.test(await page.locator('#local-bookings').innerText()) && /PRIVATE/.test(await page.locator('#local-bookings').innerText()));
  check('local booking text contrast', await readableContrast(page, '#local-bookings li, #local-bookings li strong, #local-bookings li span, #local-bookings button'));
  await page.locator('[data-cancel-booking]').click();
  await page.locator('#booking-reset').click();
  await fillBooking(page);
  for(let id=1;id<=20;id++) await page.locator(`#seat-${id}`).click();
  check('all20 seats selected across zones', await page.locator('[data-seat-state="selected"]').count() === 20 && await page.locator('#player-count').inputValue() === '20');
  const totals = await page.evaluate(() => window.TopGameLogic.estimateVisit(window.TopGame.tariffs,'hour',2,20));
  check('20-player estimator has no zone cap', totals && totals.amount === 48000 && totals.groupTotalKnown);
  await page.locator('#booking-submit').click();
  check('20-PC booking accepted', await page.locator('[data-cancel-booking]').count() === 1 && await page.locator('#booking-success').isVisible());
  const accepted = await page.locator('#booking-success').innerText();
  check('booking reference contains no demo prefix', !/демо|demo|демонстр/i.test(accepted));
  await page.locator('#booking-submit').click();
  check('repeated submit creates no duplicate', await page.locator('[data-cancel-booking]').count() === 1 && await page.locator('#booking-success').innerText() === accepted);
  check('booking stores20PCs without contacts', await page.evaluate(() => { const b=JSON.parse(localStorage.getItem('topgame-bookings')); return b.length===1 && b[0].seats.length===20 && !('name' in b[0]) && !('email' in b[0]) && !('phone' in b[0]); }));
  await page.reload();
  check('20PC booking survives reload', await page.locator('[data-cancel-booking]').count() === 1 && await page.evaluate(() => JSON.parse(localStorage.getItem('topgame-bookings'))[0].seats.length === 20));
  await fillBooking(page);
  await page.locator('#booking-time').fill('15:00');
  check('overlap blocks every reserved seat', await page.locator('[data-seat-state="occupied"]').count() === 20 && await page.locator('#seat-1').isDisabled());
  await page.locator('#booking-submit').click();
  check('overlap submission rejected without duplicate', await page.locator('#seat-map').getAttribute('aria-invalid') === 'true' && await page.locator('[data-cancel-booking]').count() === 1);
  await page.locator('#booking-time').fill('16:00');
  check('adjacent boundary frees same seats', await page.locator('[data-seat-state="occupied"]').count() === 0 && !await page.locator('#seat-1').isDisabled());
  await page.locator('#seat-1').click();
  await page.locator('#booking-submit').click();
  check('adjacent interval accepted', await page.locator('[data-cancel-booking]').count() === 2);
  while(await page.locator('[data-cancel-booking]').count()) await page.locator('[data-cancel-booking]').first().click();
  await page.locator('#booking-reset').click();
  await fillBooking(page);
  await page.locator('#player-count').fill('21');
  await page.locator('#booking-submit').click();
  check('booking rejects >20', await page.locator('#player-count').getAttribute('aria-invalid') === 'true');
  await page.locator('#player-count').fill('1.5');
  await page.locator('#booking-submit').click();
  check('booking rejects fractional count', await page.locator('#player-count').getAttribute('aria-invalid') === 'true');
  await page.locator('#player-count').fill('1');
  await page.locator('#booking-date').fill('2000-01-01');
  await page.locator('#booking-submit').click();
  check('booking rejects past date', await page.locator('#booking-date').getAttribute('aria-invalid') === 'true');
  await page.locator('#booking-date').fill(await page.evaluate(() => window.TopGame.today()));
  await page.locator('#booking-time').fill('00:00');
  await page.locator('#booking-submit').click();
  check('booking rejects past time today', await page.locator('#booking-time').getAttribute('aria-invalid') === 'true');
  await page.locator('#booking-reset').click();
  await fillBooking(page);
  for (const id of ['three-hours','five-hours','day','night','private']) {
    await page.locator('#booking-tariff').selectOption(id);
    const tariff = await page.evaluate(id=>window.TopGame.tariffs.find(t=>t.id===id),id);
    if(!tariff.hourly) check(`${id} booking package duration matches data`, Number(await page.locator('#booking-duration').inputValue()) === tariff.duration);
    if (!tariff.hourly) {
      await page.locator('#booking-duration').fill(String(tariff.duration === 1 ? 2 : 1));
      await page.locator('#booking-submit').click();
      check(`${id} rejects wrong package duration`, await page.locator('#booking-duration').getAttribute('aria-invalid') === 'true');
      await page.locator('#booking-duration').fill(String(tariff.duration));
    }
    await page.locator('#seat-16').click();
    await page.locator('#booking-submit').click();
    check(`${id} accepted on PRIVATE computer`, await page.locator('[data-cancel-booking]').count() === 1 && await page.locator('#booking-success').isVisible());
    await page.locator('[data-cancel-booking]').click();
    await page.locator('#clear-seat-selection').click();
  }
  await page.locator('#seat-1').click();
  await page.locator('#clear-seat-selection').click();
  check('clear-seat button removes selections', await page.locator('[data-seat-state="selected"]').count() === 0);
  await page.locator('#booking-reset').click();
  check('booking reset clears contacts and seat selections', await page.locator('#customer-name').inputValue()==='' && await page.locator('[data-seat-state="selected"]').count()===0);
  for (const id of tariffIds) {
    await page.goto(`${pathToFileURL(path.join(repo,'booking.html')).href}?date=${futureDate(5)}&players=20&tariff=${id}&hours=4&game=Dota%202`);
    const tariff = await page.evaluate(id=>window.TopGame.tariffs.find(t=>t.id===id),id);
    check(`${id} booking query retains20/date/game/duration`, await page.locator('#player-count').inputValue()==='20' && await page.locator('#booking-date').inputValue()===futureDate(5) && /Dota 2/.test(await page.locator('#booking-comment').inputValue()) && Number(await page.locator('#booking-duration').inputValue())===(tariff.hourly ? 4 : tariff.duration));
  }
  await noDemoVisible(page, 'booking flow');
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
  check('game request honest saved confirmation', !/demo|демо|демонстр/i.test(await page.locator('#game-request-success').innerText()) && /сохран|принят/i.test(await page.locator('#game-request-success').innerText()));
  check('game request saved in local storage', await page.evaluate(()=>JSON.parse(localStorage.getItem('topgame-game-request')||'null')?.title==='Counter-Strike 2'));
  await noDemoVisible(page,'game request success');
  await page.locator('#game-request-reset').click();
  check('game request reset clears name', await page.locator('#visitor-name').inputValue() === '');
}

async function pageFlows(page) {
  await page.goto(pathToFileURL(path.join(repo, 'index.html')).href);
  check('home states20 computers', /20\s*(?:игров|компьютер|ПК)/i.test(await page.locator('main').innerText()) && !/45\s*(?:игров|компьютер|ПК)/i.test(await page.locator('main').innerText()));
  await page.goto(pathToFileURL(path.join(repo, 'prices.html')).href);
  await page.locator('#prices-search').fill('zzzzzz_no_results');
  check('tariff search no results', /0/.test(await page.locator('#prices-result-count').innerText()));
  await page.locator('#prices-filter-reset').click();
  check('tariff search reset', await page.locator('#prices-search').inputValue()==='' && await page.locator('[data-tariff]').count()===6);
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
  check('cart add totals', /2/.test(await page.locator('#food-cart-total').innerText()) && /3\s*600/.test(await page.locator('#food-cart-total').innerText()));
  check('food count preserved after add', /Найдено/.test(await page.locator('#food-count').innerText()));
  const increase = page.locator('[data-cart-action="increase"][data-item-id="burger"]');
  await increase.focus();
  await increase.press('Enter');
  check('cart increase recalculates total', /6\s*300/.test(await page.locator('#food-cart-total').innerText()));
  check('cart increase restores keyboard focus', await page.evaluate(() => document.activeElement.dataset.cartAction) === 'increase');
  await page.locator('[data-cart-action="decrease"][data-item-id="burger"]').click();
  check('cart decrease recalculates total', /3\s*600/.test(await page.locator('#food-cart-total').innerText()));
  await page.locator('[data-cart-action="remove"][data-item-id="cola"]').click();
  check('cart remove recalculates total', /2\s*700/.test(await page.locator('#food-cart-total').innerText()));
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
  check('food saved order success summary', await page.locator('#food-order-success').isVisible() && !/demo|демо|демонстр/i.test(success) && /3\s*225/.test(success) && /ПК 1/.test(success));
  check('food order stored in local storage', await page.evaluate(()=>{ const orders=JSON.parse(localStorage.getItem('topgame-orders')||'[]'); return orders.length===1 && orders[0].total===3225 && orders[0].items.length===2 && !('email' in orders[0]) && !('phone' in orders[0]); }));
  await noDemoVisible(page,'food order success');
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

async function noDemoVisible(page, label) {
  const text = await page.locator('body').innerText();
  const matches = text.match(/[^\n]*(?:demo|демо|демонстр)[^\n]*/ig) || [];
  check(`no visible demo wording: ${label}`, matches.length===0, matches);
}

async function readableContrast(page, selector) {
  const measured = await page.locator(selector).evaluateAll(elements => {
    function rgb(value) { return (value.match(/[\d.]+/g)||[]).map(Number); }
    function luminance(c) { return c.slice(0,3).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0); }
    function background(node) {
      while (node) { const c=rgb(getComputedStyle(node).backgroundColor); if(c.length===3 || c[3]===1) return c; node=node.parentElement; } return [255,255,255];
    }
    return elements.filter(e=>e.getBoundingClientRect().width && e.innerText.trim()).map(e=>{
      const f=luminance(rgb(getComputedStyle(e).color)), b=luminance(background(e));
      return {tag:e.tagName,text:e.innerText.slice(0,50),contrast:(Math.max(f,b)+0.05)/(Math.min(f,b)+0.05)};
    });
  });
  report.contrasts = report.contrasts || [];
  report.contrasts.push({selector, measured});
  return measured.length>0 && measured.every(x=>x.contrast>=4.5);
}

async function packagesFlow(page) {
  await page.goto(pathToFileURL(path.join(repo,'prices.html')).href);
  const tariffs = await page.evaluate(()=>window.TopGame.tariffs);
  check('six tariff data objects', JSON.stringify(tariffs.map(t=>t.id)) === JSON.stringify(['hour','three-hours','five-hours','day','night','private']));
  check('all6 tariff cards rendered', await page.locator('[data-tariff]').count() === 6);
  check('all6 comparison table rows', await page.locator('#prices-table-1 tbody tr').count() === 6);
  check('tariff table readable contrast', await readableContrast(page,'#prices-table-1 th, #prices-table-1 td'));
  await page.locator('#prices-table-1').screenshot({path:path.join(evidence,'tariff-table-1440.png')});
  const options = await page.locator('#calculator-tariff option').evaluateAll(options=>options.map(o=>o.value));
  check('calculator options identical6 tariff ids', JSON.stringify(options)===JSON.stringify(tariffs.map(t=>t.id)));
  for(const [index,tariff] of tariffs.entries()) {
    const formatted = await page.evaluate(p=>window.TopGame.money(p),tariff.price);
    const cardText = await page.locator(`#tariff-${tariff.id}`).innerText();
    const rowText = await page.locator('#prices-table-1 tbody tr').nth(index).innerText();
    check(`${tariff.id} price/name match card and table`, cardText.includes(tariff.name) && cardText.includes(formatted) && rowText.includes(tariff.name) && rowText.includes(formatted));
    await page.locator('#calculator-tariff').selectOption(tariff.id);
    await page.locator('#calculator-players').fill('20');
    if(tariff.hourly) await page.locator('#calculator-hours').fill('4');
    const expected = tariff.price*20*(tariff.hourly?4:1);
    const expectedText = await page.evaluate(p=>window.TopGame.money(p),expected);
    check(`${tariff.id} calculator accepts20 and computes algebra`, (await page.locator('#calculator-summary').innerText()).includes(expectedText) && await page.locator('#calculator-booking-link').isVisible());
    await page.locator('#price-calculator-form button[type="submit"]').click();
    check(`${tariff.id} calculation submit succeeds`, await page.locator('#calculator-status').isVisible() && /готов/i.test(await page.locator('#calculator-status').innerText()));
    const next=await page.locator('#calculator-booking-link').getAttribute('href');
    await page.goto(new URL(next,page.url()).href);
    check(`${tariff.id} calculator journey retains20/duration/tariff`, await page.locator('#booking-tariff').inputValue()===tariff.id && await page.locator('#player-count').inputValue()==='20' && Number(await page.locator('#booking-duration').inputValue())===(tariff.hourly?4:tariff.duration));
    await page.goto(pathToFileURL(path.join(repo,'prices.html')).href);
  }
  await page.locator('#calculator-players').fill('21');
  await page.locator('#price-calculator-form button[type="submit"]').click();
  check('calculator rejects >20 and focuses player field', await page.locator('#calculator-booking-link').isHidden() && await page.evaluate(()=>document.activeElement.id)==='calculator-players');
  await page.locator('#price-calculator-form button[type="reset"]').click();
  await page.waitForTimeout(20);
  check('calculator reset returns valid defaults', await page.locator('#calculator-players').inputValue()==='1' && await page.locator('#calculator-hours').inputValue()==='1' && await page.locator('#calculator-booking-link').isVisible());
  await page.locator('#prices-type').selectOption('duration');
  check('fixed duration tariff filter4', await page.locator('[data-tariff]').count()===4);
  await page.locator('#prices-type').selectOption('night');
  check('night tariff filter1', await page.locator('[data-tariff]').count()===1);
  await page.locator('#prices-filter-reset').click();
  check('tariff reset restores6 cards', await page.locator('[data-tariff]').count()===6);
  await noDemoVisible(page,'packages flow');
}

async function newPresentationFlow(page) {
  await page.goto(pathToFileURL(path.join(repo,'games.html')).href);
  check('six game images', await page.locator('#game-cards img').count()===6);
  check('six distinct cover sources', await page.locator('#game-cards img').evaluateAll(images=>new Set(images.map(i=>i.getAttribute('src'))).size===6 && images.every(i=>!/(gaming-hall|peripherals)/.test(i.src) && i.naturalWidth>0 && getComputedStyle(i).objectFit==='cover')));
  check('game covers same height', await page.locator('#game-cards img').evaluateAll(images=>new Set(images.map(i=>Math.round(i.getBoundingClientRect().height))).size===1));
  const official=await page.locator('#game-cards a[target="_blank"]').evaluateAll(links=>links.map(a=>({href:a.href,rel:a.rel})));
  check('six official game links safely open', official.length===6 && official.every(a=>/^https:\/\//.test(a.href) && /noopener/.test(a.rel)));
  check('official game links readable contrast', await readableContrast(page,'#game-cards a[target="_blank"]'));
  await page.locator('#game-cards').screenshot({path:path.join(evidence,'game-cards-1440.png')});
  await page.locator('#games-category').selectOption('moba');
  check('game genre filter2', await page.locator('[data-game]').count()===2);
  await page.locator('#games-filter-reset').click();
  await noDemoVisible(page,'games presentation');
  await page.setViewportSize({width:375,height:900});
  await page.goto(pathToFileURL(path.join(repo,'booking.html')).href);
  await page.locator('label[for="main-navigation-toggle"]').click();
  await page.locator('#nav-food').focus();
  await page.locator('#nav-food').press('Escape');
  check('mobile menu Escape closes and restores toggle focus', !await page.locator('#main-navigation-toggle').isChecked() && await page.evaluate(()=>document.activeElement.id)==='main-navigation-toggle');
  await page.setViewportSize({width:1440,height:1000});
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
      const dark = await page.evaluate(()=>({theme:document.documentElement.dataset.bsTheme,bodyBg:getComputedStyle(document.body).backgroundColor,bodyText:getComputedStyle(document.body).color}));
      check(`dark theme ${file} ${width}`,dark.theme==='dark' && dark.bodyBg==='rgb(33, 37, 41)',dark);
      await noDemoVisible(page,`${file} ${width}`);
      const entry = { file, width, ...dimensions, dark, consoleErrors, pageErrors, requestsFailed };
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
  for (const flow of [bookingFlow, gamesFlow, pageFlows, foodFlow, packagesFlow, newPresentationFlow]) {
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
