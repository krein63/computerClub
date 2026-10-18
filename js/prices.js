'use strict';

function setupPrices() {
    const app = window.TopGame;
    const section = document.getElementById('tariffs');
    if (!app || !section) return;

    // 1. Фильтры работают с готовыми карточками из HTML.
    const catalogue = section.querySelector('.row.g-4');
    const controls = document.getElementById('prices-filters');
    const search = document.getElementById('prices-search');
    const type = document.getElementById('prices-type');
    const count = document.getElementById('prices-result-count');
    const tariffCards = [];
    for (const tariff of app.tariffs) {
        const article = document.getElementById('tariff-' + tariff.id);
        const card = { tariff: tariff, node: article.parentElement };
        tariffCards.push(card);
        article.querySelector('a[data-tariff]').href = `booking.html?tariff=${encodeURIComponent(tariff.id)}#tariff-selection`;
    }

    function getTariffNode(card) {
        return card.node;
    }

    function renderTariffs() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = [];
        for (const card of tariffCards) {
            const tariff = card.tariff;
            if (!tariff.name.toLocaleLowerCase('ru').includes(query)) continue;
            if (type.value === 'duration') {
                if (tariff.duration === null) continue;
            } else if (type.value !== 'all' && tariff.id !== type.value) {
                continue;
            }
            matches.push(card);
        }
        app.renderList(catalogue, matches, getTariffNode, 'Подходящих тарифов нет. Измените поиск или сбросьте фильтры.');
        count.textContent = `Найдено тарифов: ${matches.length} из ${tariffCards.length}`;
    }

    function submitFilters(event) {
        event.preventDefault();
        renderTariffs();
    }

    function resetFilters() {
        controls.reset();
        renderTariffs();
        search.focus();
    }

    // 2. Получаем поля калькулятора и добавляем тарифы из общих данных.
    const calculatorForm = document.getElementById('price-calculator-form');
    const selected = document.getElementById('calculator-tariff');
    const players = document.getElementById('calculator-players');
    const playersHelp = document.getElementById('calculator-players-help');
    const hours = document.getElementById('calculator-hours');
    const hoursHelp = document.getElementById('calculator-hours-help');
    const summary = document.getElementById('calculator-summary');
    const confirmation = document.getElementById('calculator-status');
    const next = document.getElementById('calculator-booking-link');
    for (const tariff of app.tariffs) {
        const option = app.el('option', '', `${tariff.name} — от ${app.money(tariff.price)}`);
        option.value = tariff.id;
        selected.append(option);
    }

    // 3. Проверяем количество игроков и часов, затем считаем цену.
    function calculate() {
        let tariff = app.tariffs[0];
        for (const item of app.tariffs) {
            if (item.id === selected.value) tariff = item;
        }
        const quantity = Number(players.value);
        const duration = Number(hours.value);
        let zone = 'main';
        if (tariff.id === 'private') zone = 'private';
        let capacity = 0;
        for (const seat of app.seats) {
            if (seat.zone === zone) capacity += 1;
        }
        let error = '';
        let errorField = null;
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > capacity) {
            error = `Укажите целое количество игроков от 1 до ${capacity}: столько мест предусмотрено для выбранной зоны в демонстрационной схеме.`;
            errorField = players;
        } else if (tariff.id === 'hour' && (!Number.isInteger(duration) || duration < 1 || duration > 12)) {
            error = 'Для почасового расчёта укажите целое количество часов от 1 до 12.';
            errorField = hours;
        }
        let total = null;
        if (!error && tariff.id !== 'private') {
            total = tariff.price * quantity;
            if (tariff.id === 'hour') total *= duration;
        }
        return { tariff, quantity, duration, capacity, error, errorField, total };
    }

    function updateCalculation() {
        const result = calculate();
        players.max = String(result.capacity);
        let zoneName = 'Main';
        if (result.tariff.id === 'private') zoneName = 'Private';
        playersHelp.textContent = `Расчёт для ${zoneName}: до ${result.capacity} мест по демонстрационной схеме. Реальную вместимость уточните у клуба.`;
        hours.disabled = result.tariff.id !== 'hour';
        if (result.tariff.duration === 3) {
            hours.value = '3';
            hoursHelp.textContent = 'Пакет включает 3 часа на игрока.';
        } else if (result.tariff.id === 'hour') {
            hoursHelp.textContent = 'Для почасового тарифа можно рассчитать от 1 до 12 часов.';
        } else if (result.tariff.id === 'night') {
            hoursHelp.textContent = 'Часы начала и окончания ночного пакета в источнике не указаны.';
        } else {
            hoursHelp.textContent = 'Период оплаты Private в источнике не указан.';
        }
        confirmation.classList.add('hidden');
        if (result.error) {
            summary.textContent = result.error;
            summary.classList.add('error');
            next.classList.add('hidden');
            next.removeAttribute('href');
            return;
        }
        summary.classList.remove('error');
        next.classList.remove('hidden');
        if (result.total === null) {
            summary.textContent = `${result.tariff.name}; игроков: ${result.quantity}. Опубликована цена от ${app.money(result.tariff.price)}. Общую стоимость группы рассчитать нельзя: неизвестен период и порядок оплаты Private. Уточните условия у администратора.`;
        } else {
            let durationText = '3 ч. на игрока';
            if (result.tariff.id === 'hour') durationText = result.duration + ' ч. на игрока';
            if (result.tariff.id === 'night') durationText = 'точные часы пакета уточняются';
            summary.textContent = `${result.tariff.name}; ${durationText}; игроков: ${result.quantity}. Предварительно от ${app.money(result.total)}. Итоговая стоимость может отличаться.`;
        }
        const params = new URLSearchParams();
        params.set('tariff', result.tariff.id);
        params.set('players', String(result.quantity));
        if (result.tariff.id === 'hour') params.set('hours', String(result.duration));
        if (result.tariff.id === 'private') params.set('zone', 'private');
        next.href = `booking.html?${params.toString()}#booking-form`;
    }

    // 4. Обновляем расчёт при вводе и показываем результат проверки.
    function editCalculation() {
        app.clearErrors(calculatorForm);
        updateCalculation();
    }

    function submitCalculation(event) {
        event.preventDefault();
        app.clearErrors(calculatorForm);
        const result = calculate();
        updateCalculation();
        if (result.error) {
            app.setError(result.errorField, result.error);
            app.notify(confirmation, 'Расчёт не завершён. Исправьте отмеченное поле.', 'error');
            result.errorField.focus();
            return;
        }
        let message = 'Предварительный расчёт готов. Перейдите к выбору мест и проверке времени визита. Реальное бронирование не создано.';
        if (result.tariff.id === 'private') {
            message = 'Параметры выбраны. Уточните стоимость Private у администратора и перейдите к выбору мест. Реальное бронирование не создано.';
        }
        app.notify(confirmation, message, 'success');
    }

    function finishReset() {
        updateCalculation();
        app.notify(confirmation, 'Расчёт сброшен.', '');
    }

    function resetCalculation() {
        app.clearErrors(calculatorForm);
        // Ждём, пока браузер вернёт полям начальные значения.
        setTimeout(finishReset, 0);
    }

    controls.addEventListener('submit', submitFilters);
    controls.addEventListener('input', renderTariffs);
    document.getElementById('prices-filter-reset').addEventListener('click', resetFilters);
    calculatorForm.addEventListener('input', editCalculation);
    calculatorForm.addEventListener('change', editCalculation);
    calculatorForm.addEventListener('submit', submitCalculation);
    calculatorForm.addEventListener('reset', resetCalculation);
    renderTariffs();
    updateCalculation();
}

setupPrices();
