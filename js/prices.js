'use strict';

(() => {
    const app = window.TopGame;
    const section = document.getElementById('tariffs');
    if (!app || !section) return;
    const catalogue = section.querySelector('.row');
    // Карточки, таблица и расчёт используют один массив тарифов.
    section.querySelector(':scope > p').textContent = 'Выберите длительность сеанса. Стоимость пакетов указана за один компьютер.';
    const tariffCards = app.tariffs.map(tariff => {
        const column = app.el('div', 'col-12 col-md-6 col-xl-4');
        const card = app.el('article', 'card h-100 shadow-sm');
        card.id = `tariff-${tariff.id}`;
        const body = app.el('div', 'card-body p-3 p-lg-4 d-flex flex-column');
        body.append(app.el('h3', 'h4 fw-bold mb-2', tariff.name));
        body.append(app.el('p', 'text-danger fs-4 fw-bold mb-2', app.money(tariff.price)));
        body.append(app.el('p', 'small text-body-secondary', tariff.hourly ? 'За ПК / час' : `За ПК / ${tariff.duration} ч.`));
        body.append(app.el('p', 'mb-3', tariff.description));
        const link = app.el('a', 'btn btn-outline-danger mt-auto', 'Выбрать пакет');
        link.dataset.tariff = tariff.id;
        link.href = `booking.html?tariff=${tariff.id}&hours=${tariff.duration}#booking-form`;
        body.append(link);
        card.append(body);
        column.append(card);
        return { ...tariff, node: column };
    });
    const comparison = document.getElementById('prices-table-1');
    comparison.classList.add('table-dark');
    app.renderList(comparison.querySelector('tbody'), app.tariffs, tariff => {
        const row = app.el('tr');
        const name = app.el('th', 'text-break', tariff.name);
        name.scope = 'row';
        row.append(name, app.el('td', 'text-break', app.money(tariff.price)));
        row.append(app.el('td', 'text-break d-none d-md-table-cell', tariff.hourly ? 'За час на ПК' : `${tariff.duration} часов на ПК`));
        row.append(app.el('td', 'text-break d-none d-md-table-cell', tariff.audience));
        return row;
    });
    document.querySelector('#tariff-comparison > p').textContent = 'Стоимость группы = цена пакета × число выбранных ПК. Почасовые тарифы также учитывают длительность.';
    const controls = app.el('form', 'row g-3 mb-4');
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Поиск тарифов');
    function field(id, labelText, kind, choices) {
        const wrapper = app.el('div', 'col-12 col-md-6');
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const input = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
        input.id = id;
        if (choices) choices.forEach(([value, text]) => {
            const option = app.el('option', '', text);
            option.value = value;
            input.append(option);
        });
        wrapper.append(label, input);
        return { wrapper, input };
    }
    const search = field('prices-search', 'Найти тариф', 'input');
    search.input.type = 'search';
    const type = field('prices-type', 'Формат сеанса', 'select', [['all', 'Все тарифы'], ['duration', 'С указанной длительностью'], ['night', 'Ночной пакет'], ['private', 'Приватная зона']]);
    const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
    reset.type = 'button';
    reset.id = 'prices-filter-reset';
    const count = app.el('p', 'mb-0');
    count.id = 'prices-result-count';
    count.setAttribute('aria-live', 'polite');
    const actions = app.el('div', 'col-12 d-flex flex-wrap gap-3 align-items-center');
    actions.append(reset, count);
    controls.append(search.wrapper, type.wrapper, actions);
    catalogue.before(controls);
    tariffCards.forEach(tariff => {
        const link = tariff.node.querySelector('a[data-tariff]');
        link.href = `booking.html?tariff=${encodeURIComponent(tariff.id)}#tariff-selection`;
    });
    function renderTariffs() {
        const query = search.input.value.trim().toLocaleLowerCase('ru');
        const matches = tariffCards.filter(tariff => tariff.name.toLocaleLowerCase('ru').includes(query)
            && (type.input.value === 'all' || (type.input.value === 'duration' ? !tariff.hourly : tariff.id === type.input.value)));
        app.renderList(catalogue, matches, tariff => tariff.node, 'Подходящих тарифов нет. Измените поиск или сбросьте фильтры.');
        count.textContent = `Найдено тарифов: ${matches.length} из ${tariffCards.length}`;
    }
    controls.addEventListener('submit', event => { event.preventDefault(); renderTariffs(); });
    controls.addEventListener('input', renderTariffs);
    controls.addEventListener('change', renderTariffs);
    reset.addEventListener('click', () => { controls.reset(); renderTariffs(); search.input.focus(); });

    const calculator = app.el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    calculator.id = 'price-calculator';
    const heading = app.el('h2', 'h2 fw-bold mb-3', 'Рассчитать стоимость визита');
    heading.id = 'price-calculator-title';
    calculator.setAttribute('aria-labelledby', heading.id);
    const explanation = app.el('p', 'mb-3', 'Выберите пакет и количество компьютеров. Для почасовых тарифов укажите длительность.');
    const calculatorForm = app.el('form', 'row g-3');
    calculatorForm.id = 'price-calculator-form';
    calculatorForm.noValidate = true;
    const selected = field('calculator-tariff', 'Тариф', 'select', app.tariffs.map(tariff => [tariff.id, `${tariff.name} — ${app.money(tariff.price)}`]));
    const players = field('calculator-players', 'Количество игроков', 'input');
    players.input.type = 'number';
    players.input.min = '1';
    players.input.max = String(app.seats.length);
    players.input.step = '1';
    players.input.value = '1';
    players.input.defaultValue = '1';
    players.input.required = true;
    const playersHelp = app.el('p', 'form-text');
    playersHelp.id = 'calculator-players-help';
    players.input.setAttribute('aria-describedby', playersHelp.id);
    players.wrapper.append(playersHelp);
    const hours = field('calculator-hours', 'Планируемая длительность, часов', 'input');
    hours.input.type = 'number';
    hours.input.min = '1';
    hours.input.max = '12';
    hours.input.step = '1';
    hours.input.value = '1';
    hours.input.defaultValue = '1';
    const hoursHelp = app.el('p', 'form-text', 'Для почасового тарифа можно рассчитать от 1 до 12 часов.');
    hoursHelp.id = 'calculator-hours-help';
    hours.input.setAttribute('aria-describedby', hoursHelp.id);
    hours.wrapper.append(hoursHelp);
    const summary = app.el('p', 'alert alert-light border mb-3 text-break');
    summary.id = 'calculator-summary';
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    const confirmation = app.el('p', 'hidden p-3 rounded-3');
    confirmation.id = 'calculator-status';
    confirmation.setAttribute('role', 'status');
    const submit = app.el('button', 'btn btn-danger', 'Проверить расчёт');
    submit.type = 'submit';
    const clear = app.el('button', 'btn btn-outline-secondary', 'Сбросить расчёт');
    clear.type = 'reset';
    const next = app.el('a', 'btn btn-outline-danger', 'Выбрать места');
    next.id = 'calculator-booking-link';
    const nextWrapper = app.el('p', 'd-flex flex-wrap gap-2 mb-0');
    nextWrapper.append(submit, clear, next);
    const result = app.el('div', 'col-12');
    result.append(summary, confirmation, nextWrapper);
    calculatorForm.append(selected.wrapper, players.wrapper, hours.wrapper, result);
    calculator.append(heading, explanation, calculatorForm);
    section.after(calculator);

    function calculate() {
        const tariff = app.tariffs.find(item => item.id === selected.input.value);
        const quantity = Number(players.input.value);
        const duration = tariff.hourly ? Number(hours.input.value) : tariff.duration;
        const capacity = app.seats.length;
        const error = !app.validQuantity(quantity, capacity)
            ? `Укажите целое количество ПК от 1 до ${capacity}.`
            : !app.validQuantity(duration, 12) ? 'Укажите от 1 до 12 полных часов.' : '';
        const estimate = app.estimateVisit(app.tariffs, tariff.id, duration, quantity);
        return { tariff, quantity, duration, capacity, error, total: estimate ? estimate.amount : null };
    }
    function updateCalculation() {
        const tariff = app.tariffs.find(item => item.id === selected.input.value);
        hours.input.disabled = !tariff.hourly;
        if (!tariff.hourly) hours.input.value = String(tariff.duration);
        const selection = calculate();
        playersHelp.textContent = `От 1 до ${selection.capacity} ПК. Места можно выбрать в разных зонах.`;
        hoursHelp.textContent = tariff.hourly ? 'От 1 до 12 часов, стоимость за каждый час.' : `Пакет включает ${tariff.duration} часов на каждый ПК.`;
        confirmation.classList.add('hidden');
        next.classList.toggle('hidden', Boolean(selection.error));
        if (selection.error) {
            summary.textContent = selection.error;
            summary.classList.add('error');
            next.removeAttribute('href');
            return;
        }
        summary.classList.remove('error');
        summary.textContent = `${selection.tariff.name}; ${selection.duration} ч.; ПК: ${selection.quantity}. Итого: ${app.money(selection.total)}.`;
        const params = new URLSearchParams({ tariff: selection.tariff.id, players: String(selection.quantity), hours: String(selection.duration) });
        next.href = `booking.html?${params.toString()}#booking-form`;
    }
    calculatorForm.addEventListener('input', event => {
        app.clearErrors(calculatorForm);
        updateCalculation();
    });
    calculatorForm.addEventListener('change', () => {
        app.clearErrors(calculatorForm);
        updateCalculation();
    });
    calculatorForm.addEventListener('submit', event => {
        event.preventDefault();
        app.clearErrors(calculatorForm);
        const selection = calculate();
        updateCalculation();
        if (selection.error) {
            const invalid = !Number.isInteger(selection.quantity) || selection.quantity < 1 || selection.quantity > selection.capacity ? players.input : hours.input;
            app.setError(invalid, selection.error);
            app.notify(confirmation, 'Расчёт не завершён. Исправьте отмеченное поле.', 'error');
            invalid.focus();
            return;
        }
        app.notify(confirmation, 'Расчёт готов. Перейдите к выбору свободных компьютеров.', 'success');
    });
    calculatorForm.addEventListener('reset', () => {
        app.clearErrors(calculatorForm);
        setTimeout(() => { updateCalculation(); app.notify(confirmation, 'Расчёт сброшен.', ''); }, 0);
    });
    renderTariffs();
    updateCalculation();
})();
