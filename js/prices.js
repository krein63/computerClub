'use strict';

// Plain JavaScript only. Catalogue, calculator and budget finder share the real
// arrays at the top of data.js; this feature never calls a jQuery DOM helper.
(() => {
  const tariffs = window.TopGameData.tariffs;
  const seats = window.TopGameData.seats;
  const limits = { hours: 12, players: seats.length };
  const logic = window.TopGameLogic;

  function element(tag, classes = '', text = '') {
    const node = document.createElement(tag);
    node.className = classes;
    node.textContent = text;
    return node;
  }
  function money(amount) { return `${new Intl.NumberFormat('ru-KZ').format(amount)} ₸`; }
  function field(id, labelText, tag = 'input', choices = []) {
    const wrapper = element('div', 'col-12 col-md-6');
    const label = element('label', 'form-label fw-semibold', labelText);
    label.htmlFor = id;
    const input = element(tag, tag === 'select' ? 'form-select bg-dark text-light' : 'form-control bg-dark text-light');
    input.id = id;
    for (const [value, text] of choices) {
      const option = element('option', '', text);
      option.value = value;
      input.append(option);
    }
    const error = element('span', 'd-block small mt-1 mb-0 hidden');
    error.id = `${id}-error`;
    input.setAttribute('aria-describedby', error.id);
    wrapper.append(label, input, error);
    return { wrapper, input, error };
  }
  function numberField(id, label, maximum) {
    const item = field(id, label);
    Object.assign(item.input, { type: 'number', min: '1', max: String(maximum), step: '1', required: true, defaultValue: '1', value: '1' });
    return item;
  }
  function setError(control, message) {
    control.error.textContent = message;
    control.error.classList.toggle('hidden', !message);
    control.error.classList.toggle('error', Boolean(message));
    control.input.classList.toggle('is-invalid', Boolean(message));
    control.input.setAttribute('aria-invalid', String(Boolean(message)));
    return Boolean(message);
  }
  function feedback(node, text, state = '') {
    node.textContent = text;
    node.classList.toggle('hidden', !text);
    node.classList.toggle('error', state === 'error');
    node.classList.toggle('success', state === 'success');
    return text;
  }
  function button(text, type = 'button', classes = 'btn btn-outline-light') {
    const node = element('button', classes, text);
    node.type = type;
    return node;
  }
  // Parameters + return value: called for live edits and again on form submission.
  function calculate(tariffId, rawPlayers, rawHours) {
    const tariff = tariffs.find(item => item.id === tariffId);
    const quantity = Number(rawPlayers);
    const duration = tariff && !tariff.hourly ? tariff.duration : Number(rawHours);
    const errors = {
      tariff: tariff ? '' : 'Выберите тариф из списка.',
      players: logic.validQuantity(quantity, limits.players) ? '' : `Укажите целое количество ПК от 1 до ${limits.players}.`,
      hours: logic.validQuantity(duration, limits.hours) ? '' : 'Укажите от 1 до 12 полных часов.'
    };
    const estimate = logic.estimateVisit(tariffs, tariffId, duration, quantity);
    return { tariff, quantity, duration, errors, total: estimate ? estimate.amount : null, valid: !Object.values(errors).some(Boolean) };
  }

  function initPrices() {
    const section = document.querySelector('#tariffs');
    if (!section) return;
    const catalogue = section.querySelector('.row');
    section.querySelector('p').textContent = 'Выберите длительность сеанса. Стоимость пакетов указана за один компьютер.';
    const cards = tariffs.map(tariff => {
      const column = element('div', 'col-12 col-md-6 col-xl-4');
      const card = element('article', 'card bg-dark text-light h-100 shadow-sm');
      card.id = `tariff-${tariff.id}`;
      const body = element('div', 'card-body p-3 p-lg-4 d-flex flex-column');
      const link = element('a', 'btn btn-outline-danger text-light mt-auto', 'Выбрать пакет');
      link.dataset.tariff = tariff.id;
      link.href = `booking.html?tariff=${encodeURIComponent(tariff.id)}#tariff-selection`;
      body.append(element('h3', 'h4 fw-bold mb-2', tariff.name), element('p', 'text-danger-emphasis fs-4 fw-bold mb-2', money(tariff.price)), element('p', 'small text-body-secondary', tariff.hourly ? 'За ПК / час' : `За ПК / ${tariff.duration} ч.`), element('p', 'mb-3', tariff.description), link);
      card.append(body);
      column.append(card);
      return { ...tariff, node: column };
    });
    const table = document.querySelector('#prices-table-1');
    table.classList.add('table-dark', 'd-none', 'd-md-table');
    table.querySelectorAll('.d-none.d-md-table-cell').forEach(cell => cell.classList.remove('d-none', 'd-md-table-cell'));
    const tbody = table.querySelector('tbody');
    tbody.replaceChildren();
    const mobile = element('div', 'd-md-none');
    mobile.id = 'prices-comparison-mobile';
    mobile.setAttribute('role', 'group');
    mobile.setAttribute('aria-label', 'Сравнение тарифов: все условия');
    const labels = Array.from(table.querySelectorAll('thead th'), cell => cell.textContent.trim());
    // One loop builds desktop rows and mobile cards from the price array.
    for (const tariff of tariffs) {
      const values = [tariff.name, money(tariff.price), tariff.hourly ? 'За час на ПК' : `${tariff.duration} часов на ПК`, tariff.audience];
      const row = element('tr');
      for (let index = 0; index < values.length; index++) {
        const cell = element(index ? 'td' : 'th', 'text-break', values[index]);
        if (!index) cell.scope = 'row';
        row.append(cell);
      }
      tbody.append(row);
      const card = element('article', 'bg-dark text-light border rounded-3 p-3 mb-3');
      const details = element('dl', 'mb-0');
      for (let index = 1; index < values.length; index++) details.append(element('dt', 'small text-body-secondary', labels[index]), element('dd', 'mb-3 text-break', values[index]));
      card.append(element('h3', 'h5 fw-bold mb-3', tariff.name), details);
      mobile.append(card);
    }
    table.after(mobile);
    document.querySelector('#tariff-comparison > p').textContent = 'Стоимость группы = цена пакета × число выбранных ПК. Почасовые тарифы также учитывают длительность.';
    const filters = element('form', 'row g-3 mb-4');
    filters.setAttribute('role', 'search');
    filters.setAttribute('aria-label', 'Поиск тарифов');
    const search = field('prices-search', 'Найти тариф');
    search.input.type = 'search';
    const type = field('prices-type', 'Формат сеанса', 'select', [['all', 'Все тарифы'], ['duration', 'Пакеты с фиксированной длительностью'], ['night', 'Ночной пакет'], ['private', 'Приватная зона']]);
    const reset = button('Сбросить фильтры');
    reset.id = 'prices-filter-reset';
    const count = element('p', 'mb-0');
    count.id = 'prices-result-count';
    count.setAttribute('role', 'status');
    const actions = element('div', 'col-12 d-flex flex-wrap gap-3 align-items-center');
    actions.append(reset, count);
    filters.append(search.wrapper, type.wrapper, actions);
    catalogue.before(filters);
    function renderTariffs() {
      const query = search.input.value.trim().toLocaleLowerCase('ru');
      const matches = cards.filter(tariff => tariff.name.toLocaleLowerCase('ru').includes(query) && (type.input.value === 'all' || (type.input.value === 'duration' ? !tariff.hourly : tariff.id === type.input.value)));
      catalogue.replaceChildren(...matches.map(tariff => tariff.node));
      if (!matches.length) catalogue.append(element('p', 'p-3 mb-0 text-body-secondary', 'Подходящих тарифов нет. Измените поиск или сбросьте фильтры.'));
      count.textContent = `Найдено тарифов: ${matches.length} из ${cards.length}`;
    }
    filters.addEventListener('submit', event => { event.preventDefault(); renderTariffs(); });
    search.input.addEventListener('input', renderTariffs);
    type.input.addEventListener('change', renderTariffs);
    reset.addEventListener('click', () => { filters.reset(); renderTariffs(); search.input.focus(); });

    const calculator = element('section', 'bg-body-secondary border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    calculator.id = 'price-calculator';
    calculator.setAttribute('aria-labelledby', 'price-calculator-title');
    const heading = element('h2', 'h2 fw-bold mb-3', 'Рассчитать стоимость визита');
    heading.id = 'price-calculator-title';
    const form = element('form', 'row g-3');
    form.id = 'price-calculator-form';
    form.noValidate = true;
    const selected = field('calculator-tariff', 'Тариф', 'select', tariffs.map(tariff => [tariff.id, `${tariff.name} — ${money(tariff.price)}`]));
    const players = numberField('calculator-players', 'Количество игроков', limits.players);
    const hours = numberField('calculator-hours', 'Планируемая длительность, часов', limits.hours);
    const playersHelp = element('p', 'form-text', `От 1 до ${limits.players} ПК. Места можно выбрать в разных зонах.`);
    playersHelp.id = 'calculator-players-help';
    players.wrapper.append(playersHelp);
    players.input.setAttribute('aria-describedby', `${players.error.id} ${playersHelp.id}`);
    const hoursHelp = element('p', 'form-text');
    hoursHelp.id = 'calculator-hours-help';
    hours.wrapper.append(hoursHelp);
    hours.input.setAttribute('aria-describedby', `${hours.error.id} ${hoursHelp.id}`);
    const summary = element('p', 'alert alert-dark border mb-3 text-break');
    summary.id = 'calculator-summary';
    summary.setAttribute('role', 'status');
    const status = element('p', 'hidden p-3 rounded-3');
    status.id = 'calculator-status';
    status.setAttribute('role', 'status');
    const next = element('a', 'btn btn-outline-danger text-light', 'Выбрать места');
    next.id = 'calculator-booking-link';
    const buttons = element('p', 'd-flex flex-wrap gap-2 mb-0');
    buttons.append(button('Проверить расчёт', 'submit', 'btn btn-danger'), button('Сбросить расчёт', 'reset'), next);
    const result = element('div', 'col-12');
    result.append(summary, status, buttons);
    form.append(selected.wrapper, players.wrapper, hours.wrapper, result);
    calculator.append(heading, element('p', 'mb-3', 'Выберите пакет и количество компьютеров. Для почасовых тарифов укажите длительность.'), form);
    section.after(calculator);
    function updateCalculation() {
      const selection = calculate(selected.input.value, players.input.value, hours.input.value);
      hours.input.disabled = Boolean(selection.tariff && !selection.tariff.hourly);
      if (hours.input.disabled) hours.input.value = String(selection.duration);
      hoursHelp.textContent = hours.input.disabled ? `Пакет включает ${selection.duration} часов на каждый ПК.` : 'От 1 до 12 часов, стоимость за каждый час.';
      setError(selected, selection.errors.tariff);
      setError(players, selection.errors.players);
      setError(hours, selection.errors.hours);
      feedback(status, '');
      next.classList.toggle('hidden', !selection.valid);
      summary.classList.toggle('error', !selection.valid);
      if (!selection.valid) {
        summary.textContent = Object.values(selection.errors).filter(Boolean).join(' ');
        next.removeAttribute('href');
      } else {
        summary.textContent = `${selection.tariff.name}; ${selection.duration} ч.; ПК: ${selection.quantity}. Итого: ${money(selection.total)}.`;
        next.href = `booking.html?${new URLSearchParams({ tariff: selection.tariff.id, players: String(selection.quantity), hours: String(selection.duration) })}#booking-form`;
      }
      return selection;
    }
    form.addEventListener('input', updateCalculation);
    form.addEventListener('change', updateCalculation);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const selection = calculate(selected.input.value, players.input.value, hours.input.value);
      updateCalculation();
      feedback(status, selection.valid ? 'Расчёт готов. Перейдите к выбору свободных компьютеров.' : 'Расчёт не завершён. Исправьте отмеченное поле.', selection.valid ? 'success' : 'error');
      if (!selection.valid) [selected, players, hours].find(control => control.input.getAttribute('aria-invalid') === 'true').input.focus();
    });
    form.addEventListener('reset', () => setTimeout(() => { updateCalculation(); feedback(status, 'Расчёт сброшен.'); }, 0));

    // New endterm feature: compare packages that cover the planned visit and budget.
    const finder = element('section', 'bg-body-secondary border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    finder.id = 'tariff-finder';
    finder.setAttribute('aria-labelledby', 'tariff-finder-title');
    const finderTitle = element('h2', 'h2 fw-bold mb-3', 'Подобрать тариф по бюджету команды');
    finderTitle.id = 'tariff-finder-title';
    const finderForm = element('form', 'row g-3 mb-3');
    finderForm.id = 'tariff-finder-form';
    finderForm.noValidate = true;
    const team = numberField('finder-players', 'Количество игроков', limits.players);
    const duration = numberField('finder-hours', 'Сколько часов хотите играть', limits.hours);
    const budget = field('finder-budget', 'Бюджет всей команды, ₸ (необязательно)');
    Object.assign(budget.input, { type: 'number', min: '0', step: '1' });
    const zone = field('finder-zone', 'Игровая зона', 'select', [['shared', 'MAIN / DUO'], ['private', 'PRIVATE']]);
    const period = field('finder-period', 'Время посещения', 'select', [['day', 'Дневной сеанс'], ['night', 'Ночной сеанс']]);
    const finderActions = element('div', 'col-12 d-flex flex-wrap gap-2');
    finderActions.append(button('Сравнить варианты', 'submit', 'btn btn-danger'), button('Сбросить подбор', 'reset'));
    finderForm.append(team.wrapper, duration.wrapper, budget.wrapper, zone.wrapper, period.wrapper, finderActions);
    const finderStatus = element('p', 'mb-3');
    finderStatus.id = 'finder-status';
    finderStatus.setAttribute('role', 'status');
    const options = element('div', 'row g-3');
    options.id = 'finder-results';
    finder.append(finderTitle, element('p', 'mb-3', 'Сравните пакеты, которые покрывают нужную длительность. Ночной пакет участвует только при выборе ночного сеанса. Варианты отсортированы по общей цене. Бюджет можно оставить пустым.'), finderForm, finderStatus, options);
    calculator.after(finder);
    function readVisit() {
      const quantity = Number(team.input.value);
      const wantedHours = Number(duration.input.value);
      const budgetText = budget.input.value.trim();
      const availableSeats = seats.filter(seat => zone.input.value === 'private' ? seat.zone === 'private' : seat.zone !== 'private').length;
      const errors = [
        [team, logic.validQuantity(quantity, availableSeats) ? '' : `В этой зоне выберите от 1 до ${availableSeats} игроков.`],
        [duration, logic.validQuantity(wantedHours, limits.hours) ? '' : 'Укажите от 1 до 12 полных часов.'],
        [budget, budget.input.validity.badInput || (budgetText && (!Number.isSafeInteger(Number(budgetText)) || Number(budgetText) < 0)) ? 'Введите целый бюджет от 0 ₸ или оставьте поле пустым.' : ''],
        [zone, ['shared', 'private'].includes(zone.input.value) ? '' : 'Выберите игровую зону.'],
        [period, ['day', 'night'].includes(period.input.value) ? '' : 'Выберите время посещения.']
      ];
      for (const [control, message] of errors) setError(control, message);
      return { quantity, wantedHours, budget: budgetText ? Number(budgetText) : null, zone: zone.input.value, period: period.input.value, invalid: errors.filter(([, message]) => message) };
    }
    function matchingPackages(visit) {
      const matches = [];
      for (const tariff of tariffs) {
        if ((tariff.id === 'private') !== (visit.zone === 'private')) continue;
        if (tariff.id === 'night' && visit.period !== 'night') continue;
        if (!tariff.hourly && tariff.duration < visit.wantedHours) continue;
        const coveredHours = tariff.hourly ? visit.wantedHours : tariff.duration;
        const estimate = logic.estimateVisit(tariffs, tariff.id, coveredHours, visit.quantity);
        if (!estimate || (visit.budget !== null && estimate.amount > visit.budget)) continue;
        matches.push({ tariff, hours: coveredHours, total: estimate.amount });
      }
      return matches.sort((a, b) => a.total - b.total || a.hours - b.hours);
    }
    function renderMatches() {
      const visit = readVisit();
      options.replaceChildren();
      if (visit.invalid.length) {
        feedback(finderStatus, 'Исправьте отмеченные поля, чтобы сравнить пакеты.', 'error');
        return visit;
      }
      const matches = matchingPackages(visit);
      if (!matches.length) {
        feedback(finderStatus, 'В этот бюджет подходящие пакеты не входят. Увеличьте бюджет или измените длительность и количество игроков.');
        return visit;
      }
      feedback(finderStatus, `Подходит вариантов: ${matches.length}. Минимальная сумма для команды: ${money(matches[0].total)}.`, 'success');
      for (const [index, match] of matches.entries()) {
        const column = element('div', 'col-12 col-md-6');
        const card = element('article', 'card bg-dark text-light h-100');
        card.dataset.package = match.tariff.id;
        const body = element('div', 'card-body d-flex flex-column');
        const choose = button('Использовать этот расчёт', 'button', 'btn btn-outline-danger text-light mt-auto');
        choose.dataset.choosePackage = match.tariff.id;
        choose.dataset.hours = String(match.hours);
        choose.setAttribute('aria-pressed', 'false');
        body.append(element('h3', 'h5 fw-bold mb-3', `${match.tariff.name}${index === 0 ? ' — самая низкая сумма' : ''}`), element('p', 'fw-semibold', `Команда: ${money(match.total)}; на игрока: ${money(match.total / visit.quantity)}.`), element('p', 'mb-3', `Оплачено ${match.hours} ч.; планируется ${visit.wantedHours} ч.${match.hours > visit.wantedHours ? ' Пакет оплачивается целиком, неиспользованные часы не вычитаются.' : ''}`), choose);
        card.append(body);
        column.append(card);
        options.append(column);
      }
      return visit;
    }
    finderForm.addEventListener('submit', event => { event.preventDefault(); const visit = renderMatches(); if (visit.invalid.length) visit.invalid[0][0].input.focus(); });
    finderForm.addEventListener('input', renderMatches);
    finderForm.addEventListener('change', renderMatches);
    finderForm.addEventListener('reset', () => setTimeout(renderMatches, 0));
    // Delegation catches result buttons built after the parent listener was attached.
    options.addEventListener('click', event => {
      const choose = event.target.closest('[data-choose-package]');
      if (!choose || !options.contains(choose)) return;
      const visit = readVisit();
      if (visit.invalid.length) { renderMatches(); return; }
      // Recheck the chosen offer, rather than trusting a DOM data attribute.
      const match = matchingPackages(visit).find(item => item.tariff.id === choose.dataset.choosePackage);
      if (!match) { renderMatches(); return; }
      selected.input.value = choose.dataset.choosePackage;
      players.input.value = String(visit.quantity);
      hours.input.value = String(match.hours);
      updateCalculation();
      options.querySelectorAll('[data-package]').forEach(card => card.classList.toggle('active', card.dataset.package === choose.dataset.choosePackage));
      options.querySelectorAll('[data-choose-package]').forEach(control => control.setAttribute('aria-pressed', String(control === choose)));
      feedback(finderStatus, 'Тариф выбран. Расчёт обновлён выше; нажмите «Выбрать места» для продолжения.', 'success');
      next.focus();
    });
    renderTariffs();
    updateCalculation();
    renderMatches();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPrices);
  else initPrices();
})();
