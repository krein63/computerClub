'use strict';

(() => {
    const app = window.TopGame;
    const section = document.getElementById('tariffs');
    if (!app || !section) return;
    const catalogue = section.querySelector('.row');
    const tariffCards = app.tariffs.map(tariff => ({ ...tariff, node: document.getElementById(`tariff-${tariff.id}`).parentElement }));
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
            && (type.input.value === 'all' || (type.input.value === 'duration' ? tariff.duration !== null : tariff.id === type.input.value)));
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
    const explanation = app.el('p', 'mb-3', 'Расчёт использует опубликованные цены «от». Это предварительная оценка, окончательную стоимость и условия уточните у администратора.');
    const calculatorForm = app.el('form', 'row g-3');
    calculatorForm.id = 'price-calculator-form';
    calculatorForm.noValidate = true;
    const selected = field('calculator-tariff', 'Тариф', 'select', app.tariffs.map(tariff => [tariff.id, `${tariff.name} — от ${app.money(tariff.price)}`]));
    const players = field('calculator-players', 'Количество игроков', 'input');
    players.input.type = 'number';
    players.input.min = '1';
    players.input.max = '45';
    players.input.step = '1';
    players.input.value = '1';
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
        const duration = Number(hours.input.value);
        const zone = tariff.id === 'private' ? 'private' : 'main';
        const capacity = app.seats.filter(seat => seat.zone === zone).length;
        const error = !Number.isInteger(quantity) || quantity < 1 || quantity > capacity
            ? `Укажите целое количество игроков от 1 до ${capacity}: столько мест предусмотрено для выбранной зоны в демонстрационной схеме.`
            : tariff.id === 'hour' && (!Number.isInteger(duration) || duration < 1 || duration > 12)
                ? 'Для почасового расчёта укажите целое количество часов от 1 до 12.' : '';
        if (error) return { tariff, quantity, duration, capacity, error, total: null };
        const total = tariff.id === 'private' ? null : tariff.price * quantity * (tariff.id === 'hour' ? duration : 1);
        return { tariff, quantity, duration, capacity, error, total };
    }
    function updateCalculation() {
        const selection = calculate();
        players.input.max = String(selection.capacity);
        playersHelp.textContent = `Расчёт для ${selection.tariff.id === 'private' ? 'Private' : 'Main'}: до ${selection.capacity} мест по демонстрационной схеме. Реальную вместимость уточните у клуба.`;
        hours.input.disabled = selection.tariff.id !== 'hour';
        if (selection.tariff.duration === 3) {
            hours.input.value = '3';
            hoursHelp.textContent = 'Пакет включает 3 часа на игрока.';
        } else if (selection.tariff.id === 'hour') {
            hoursHelp.textContent = 'Для почасового тарифа можно рассчитать от 1 до 12 часов.';
        } else {
            hoursHelp.textContent = selection.tariff.id === 'night' ? 'Часы начала и окончания ночного пакета в источнике не указаны.' : 'Период оплаты Private в источнике не указан.';
        }
        confirmation.classList.add('hidden');
        next.classList.toggle('hidden', Boolean(selection.error));
        if (selection.error) {
            summary.textContent = selection.error;
            summary.classList.add('error');
            next.removeAttribute('href');
            return;
        }
        summary.classList.remove('error');
        if (selection.total === null) {
            summary.textContent = `${selection.tariff.name}; игроков: ${selection.quantity}. Опубликована цена от ${app.money(selection.tariff.price)}. Общую стоимость группы рассчитать нельзя: неизвестен период и порядок оплаты Private. Уточните условия у администратора.`;
        } else {
            const durationText = selection.tariff.id === 'night' ? 'точные часы пакета уточняются' : `${selection.tariff.id === 'hour' ? selection.duration : 3} ч. на игрока`;
            summary.textContent = `${selection.tariff.name}; ${durationText}; игроков: ${selection.quantity}. Предварительно от ${app.money(selection.total)}. Итоговая стоимость может отличаться.`;
        }
        const params = new URLSearchParams({ tariff: selection.tariff.id, players: String(selection.quantity) });
        if (selection.tariff.id === 'hour') params.set('hours', String(selection.duration));
        if (selection.tariff.id === 'private') params.set('zone', 'private');
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
        app.notify(confirmation, selection.tariff.id === 'private'
            ? 'Параметры выбраны. Уточните стоимость Private у администратора и перейдите к выбору мест. Реальное бронирование не создано.'
            : 'Предварительный расчёт готов. Перейдите к выбору мест и проверке времени визита. Реальное бронирование не создано.', 'success');
    });
    calculatorForm.addEventListener('reset', () => {
        app.clearErrors(calculatorForm);
        setTimeout(() => { updateCalculation(); app.notify(confirmation, 'Расчёт сброшен.', ''); }, 0);
    });
    renderTariffs();
    updateCalculation();
})();
