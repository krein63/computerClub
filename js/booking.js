'use strict';

(() => {
    const form = document.getElementById('booking-form');
    if (!form) return;

    const { el, money, reference, today, localDateTime, store, renderList, setError, clearErrors, validateContacts, notify, tariffs, seats } = window.TopGame;
    const fields = {
        name: document.getElementById('customer-name'),
        email: document.getElementById('customer-email'),
        phone: document.getElementById('customer-phone'),
        date: document.getElementById('booking-date'),
        time: document.getElementById('booking-time'),
        players: document.getElementById('player-count'),
        tariff: document.getElementById('booking-tariff'),
        comment: document.getElementById('booking-comment'),
        agreement: document.getElementById('booking-agreement')
    };
    const zoneFieldset = document.getElementById('gaming-zone-selection');
    const zoneRadios = [...form.querySelectorAll('[name="gaming-zone"]')];
    const zoneNames = { main: 'MAIN', duo: 'DUO', private: 'PRIVATE' };
    const snapshotOccupied = [3, 4, 15, 16, 29, 34, 37, 43];
    const selectedSeats = new Set();
    const seatButtons = new Map();
    const result = document.getElementById('booking-result');
    const success = document.getElementById('booking-success');
    const formStatus = document.getElementById('booking-status');
    const resultStatus = document.getElementById('booking-result-status');
    const errors = document.getElementById('booking-errors');
    let reservations = [];
    let lastAccepted = null;
    let attempted = false;
    let storageAvailable = true;

    form.noValidate = true;
    fields.date.min = today();
    fields.players.step = '1';
    document.getElementById('booking-submit').type = 'submit';
    document.getElementById('booking-submit').textContent = 'Создать демо-заявку';
    document.getElementById('booking-submit-guard').remove();
    formStatus.textContent = 'Укажите время по Астане, выберите ПК на карте и заполните контакты. Заявка сохраняется только в этом браузере: данные не отправляются в клуб, реальное бронирование не создаётся.';
    document.querySelector('#booking-introduction > p:nth-of-type(3)').textContent = 'Выберите свободные ПК на демонстрационной схеме, проверьте предварительную стоимость и создайте локальную демо-заявку. Данные не отправляются на сервер, реальные места не бронируются.';
    document.querySelector('#booking-result > p.small').textContent = 'Все заявки на этой странице демонстрационные. Реальную доступность мест, стоимость и условия пакетов подтвердит клуб по телефону +7 706 400 50 40.';
    document.getElementById('booking-figure-1').classList.add('hidden');

    const durationWrapper = el('p', 'mb-3 col-12 col-md-6');
    const durationLabel = el('label', 'form-label fw-semibold', 'Желаемая продолжительность, часов:');
    durationLabel.htmlFor = 'booking-duration';
    const duration = el('input', 'form-control');
    duration.id = 'booking-duration';
    duration.name = 'booking-duration';
    duration.type = 'number';
    duration.min = '1';
    duration.max = '12';
    duration.step = '1';
    duration.value = '1';
    duration.required = true;
    duration.setAttribute('aria-describedby', 'booking-duration-note');
    fields.duration = duration;
    durationWrapper.append(durationLabel, duration);
    document.getElementById('tariff-selection').before(durationWrapper);
    const durationNote = el('p', 'small text-body-secondary col-12 mb-3');
    durationNote.id = 'booking-duration-note';
    document.getElementById('booking-tariff-note').before(durationNote);
    document.getElementById('booking-tariff-note').textContent = 'Цены из прайса указаны «от». PRIVATE применяется только к зоне PRIVATE. Часы ночного пакета и период оплаты PRIVATE в прайсе не указаны; их необходимо уточнить у клуба.';

    const map = el('fieldset', 'bg-dark text-white border border-secondary rounded-3 p-3 p-md-4 mb-4');
    map.id = 'seat-map';
    map.tabIndex = -1;
    const mapLegend = el('legend', 'h4 fw-bold mb-3', 'Выберите компьютеры на карте');
    const mapExplanation = el('p', 'small text-white-50 mb-3', 'Иллюстративная схема: 45 ПК, MAIN — 30, DUO — 10, PRIVATE — 5. Расположение, распределение по зонам и занятость — учебные данные, а не карта реального клуба.');
    const legend = el('div', 'd-flex flex-wrap gap-2 mb-3');
    legend.setAttribute('aria-label', 'Условные обозначения');
    legend.append(el('span', 'badge text-bg-success', 'Свободно'), el('span', 'badge text-bg-secondary', 'Занято'), el('span', 'badge text-bg-danger', 'Выбрано'));
    const mapStatus = el('p', 'small mb-3');
    mapStatus.id = 'seat-map-status';
    mapStatus.setAttribute('role', 'status');
    mapStatus.setAttribute('aria-live', 'polite');
    const mapFeedback = el('p', 'small mb-3 hidden');
    mapFeedback.id = 'seat-map-feedback';
    mapFeedback.setAttribute('role', 'status');
    mapFeedback.setAttribute('aria-live', 'polite');
    const mapZones = el('div', 'row g-3 mb-3');
    for (const zone of Object.keys(zoneNames)) {
        const zoneColumn = el('div', zone === 'main' ? 'col-12' : 'col-12 col-lg-6');
        const zoneCard = el('section', 'border border-secondary rounded-3 p-2 p-md-3 h-100');
        const zoneSeats = seats.filter(seat => seat.zone === zone);
        const heading = el('h3', 'h6 fw-bold mb-3', `${zoneNames[zone]} · ${zoneSeats.length} ПК · демо-этаж ${zoneSeats[0].floor}`);
        const grid = el('div', 'row row-cols-3 row-cols-md-5 g-2');
        if (zone === 'main') grid.classList.add('row-cols-lg-6');
        for (const seat of zoneSeats) {
            const column = el('div', 'col');
            const button = el('button', 'btn btn-outline-success w-100 h-100 px-1 py-2');
            button.id = `seat-${seat.id}`;
            button.type = 'button';
            button.dataset.seatId = String(seat.id);
            button.dataset.zone = seat.zone;
            button.setAttribute('aria-pressed', 'false');
            const number = el('span', 'd-block fw-bold', `▰ PC ${String(seat.id).padStart(2, '0')}`);
            const status = el('span', 'd-block small', 'Свободно');
            button.append(number, status);
            button.addEventListener('click', () => toggleSeat(seat));
            seatButtons.set(seat.id, { button, status });
            column.append(button);
            grid.append(column);
        }
        zoneCard.append(heading, grid);
        zoneColumn.append(zoneCard);
        mapZones.append(zoneColumn);
    }
    const clearSelection = el('button', 'btn btn-outline-light btn-sm', 'Снять выбор мест');
    clearSelection.type = 'button';
    clearSelection.id = 'clear-seat-selection';
    clearSelection.addEventListener('click', () => {
        selectedSeats.clear();
        notify(mapFeedback, 'Выбор ПК очищен. Выберите места для нового запроса.');
        refresh();
    });
    map.append(mapLegend, mapExplanation, legend, mapStatus, mapFeedback, mapZones, clearSelection);
    zoneFieldset.after(map);

    function addSummaryRow(id, label) {
        const term = el('dt', 'col-12 col-sm-5', label);
        const value = el('dd', 'col-12 col-sm-7');
        value.id = id;
        document.getElementById('booking-summary').append(term, value);
        return value;
    }
    const summarySeats = addSummaryRow('booking-summary-seats', 'Компьютеры');
    const summaryDuration = addSummaryRow('booking-summary-duration', 'Продолжительность');
    const totalNote = document.getElementById('booking-total-note');
    const total = document.getElementById('booking-total');
    total.setAttribute('for', 'booking-tariff player-count booking-duration');
    const list = document.getElementById('booking-result-list');
    success.classList.add('border', 'rounded-3', 'p-3', 'text-break');
    const localSection = el('section', 'border rounded-3 p-3 p-md-4 mt-4');
    localSection.setAttribute('aria-labelledby', 'local-bookings-title');
    const localTitle = el('h3', 'h5 fw-bold mb-3', 'Мои демо-заявки в этом браузере');
    localTitle.id = 'local-bookings-title';
    const localStatus = el('p', 'small mb-3', 'При пересечении времени один и тот же ПК нельзя выбрать дважды. Отмена освобождает место только на этой учебной схеме. Контакты не сохраняются.');
    localStatus.id = 'local-bookings-status';
    localStatus.tabIndex = -1;
    localStatus.setAttribute('role', 'status');
    localStatus.setAttribute('aria-live', 'polite');
    const localList = el('ul', 'list-group');
    localList.id = 'local-bookings';
    localSection.append(localTitle, localStatus, localList);
    result.append(localSection);

    function validDate(date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        const [year, month, day] = date.split('-').map(Number);
        const calendarDate = new Date(Date.UTC(year, month - 1, day));
        return calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() === month - 1 && calendarDate.getUTCDate() === day;
    }

    function interval(date, time, hours) {
        if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isInteger(hours) || hours < 1 || hours > 12) return null;
        const start = localDateTime(date, time);
        return Number.isFinite(start) ? { start, end: start + hours * 60 * 60 * 1000 } : null;
    }

    function overlaps(first, second) {
        return first.start < second.end && first.end > second.start;
    }

    function readReservations() {
        const saved = store.get('bookings', []);
        if (!Array.isArray(saved)) return [];
        return saved.filter(item => {
            if (!item || typeof item.id !== 'string' || item.id.length > 80 || !Object.hasOwn(zoneNames, item.zone) || !tariffs.some(tariff => tariff.id === item.tariff)) return false;
            const requested = interval(item.date, item.time, item.duration);
            return requested && requested.start === item.start && requested.end === item.end && Array.isArray(item.seats) && item.seats.length > 0 && new Set(item.seats).size === item.seats.length && item.seats.every(id => seats.some(seat => seat.id === id && seat.zone === item.zone));
        });
    }

    function values() {
        const zone = zoneRadios.find(radio => radio.checked)?.value || '';
        return {
            name: fields.name.value.trim(), email: fields.email.value.trim(), phone: fields.phone.value.trim(),
            date: fields.date.value, time: fields.time.value, players: Number(fields.players.value),
            tariff: fields.tariff.value, duration: Number(duration.value), zone,
            seats: [...selectedSeats].sort((first, second) => first - second),
            headphones: document.getElementById('headphones').checked, comment: fields.comment.value.trim()
        };
    }

    function occupiedSeats(requestedInterval) {
        if (!requestedInterval) return new Set(snapshotOccupied);
        const busy = new Set();
        // A fixed sample session demonstrates overlap logic, not live club availability.
        const sampleSession = interval(today(), '18:00', 3);
        if (overlaps(requestedInterval, sampleSession)) snapshotOccupied.forEach(id => busy.add(id));
        reservations.filter(item => overlaps(requestedInterval, item)).forEach(item => item.seats.forEach(id => busy.add(id)));
        return busy;
    }

    function chooseZone(zone) {
        zoneRadios.forEach(radio => { radio.checked = radio.value === zone; });
        selectedSeats.clear();
        if (zone === 'duo') fields.players.value = '2';
    }

    function toggleSeat(seat) {
        const data = values();
        if (occupiedSeats(interval(data.date, data.time, data.duration)).has(seat.id)) return;
        let switched = false;
        if (data.zone !== seat.zone) {
            switched = selectedSeats.size > 0;
            chooseZone(seat.zone);
        }
        if (selectedSeats.has(seat.id)) {
            selectedSeats.delete(seat.id);
            notify(mapFeedback, `PC ${seat.id} исключён из выбора.`);
        } else {
            const count = Number(fields.players.value);
            if (Number.isInteger(count) && count > 0 && selectedSeats.size >= count) {
                notify(mapFeedback, `Для ${count} игроков уже выбрано ${count} ПК. Снимите один выбор или увеличьте количество игроков.`, 'error');
                return;
            }
            selectedSeats.add(seat.id);
            notify(mapFeedback, `${switched ? 'Выбрана другая зона, предыдущие ПК сняты. ' : ''}PC ${seat.id} добавлен в выбор.`);
        }
        refresh();
    }

    function estimate(data) {
        const tariff = tariffs.find(item => item.id === data.tariff);
        if (!tariff || !Number.isInteger(data.players) || data.players < 1 || !Number.isInteger(data.duration) || data.duration < 1 || data.duration > 12) return null;
        if (tariff.id === 'three-hours' && data.duration !== 3) return null;
        if (data.zone && ((data.zone === 'private') !== (tariff.id === 'private'))) return null;
        if (data.zone === 'duo' && data.players !== 2) return null;
        if (data.zone && data.players > seats.filter(seat => seat.zone === data.zone).length) return null;
        if (tariff.id === 'private') return { amount: tariff.price, note: 'Опубликованный минимум PRIVATE. Период оплаты и единица тарификации не указаны; итог за группу и выбранную длительность уточняется в клубе.' };
        const multiplier = tariff.id === 'hour' ? data.duration : 1;
        return { amount: tariff.price * multiplier * data.players, note: tariff.id === 'night' ? 'Оценка по цене ночного пакета на игрока. Его часы и соответствие желаемой длительности уточняются в клубе.' : 'Предварительная оценка по опубликованным ценам «от» за каждого игрока. Итоговую стоимость подтвердит клуб.' };
    }

    function updateMap(data) {
        const requestedInterval = interval(data.date, data.time, data.duration);
        const busy = occupiedSeats(requestedInterval);
        for (const seat of seats) {
            const { button, status } = seatButtons.get(seat.id);
            const occupied = busy.has(seat.id);
            const selected = selectedSeats.has(seat.id);
            const state = occupied ? 'occupied' : selected ? 'selected' : 'available';
            button.disabled = occupied;
            button.dataset.seatState = state;
            button.classList.toggle('btn-outline-success', state === 'available');
            button.classList.toggle('btn-secondary', state === 'occupied');
            button.classList.toggle('btn-danger', state === 'selected');
            button.classList.toggle('selected', state === 'selected');
            button.setAttribute('aria-pressed', String(selected));
            const ownRequest = occupied && selected && lastAccepted?.data.seats.includes(seat.id) && requestedInterval && overlaps(requestedInterval, lastAccepted.data);
            status.textContent = ownRequest ? 'Ваш запрос' : occupied ? 'Занято' : selected ? 'Выбрано' : 'Свободно';
            button.setAttribute('aria-label', `PC ${seat.id}, зона ${zoneNames[seat.zone]}, ${status.textContent.toLowerCase()}`);
        }
        const freeCount = seats.length - busy.size;
        const context = requestedInterval ? `${data.date}, ${data.time}, ${data.duration} ч. по Астане.` : 'Демоснимок: укажите дату, время и длительность для проверки пересечений.';
        const sameAcceptedChoice = lastAccepted?.fingerprint === JSON.stringify(data);
        const conflictHint = requestedInterval && !sameAcceptedChoice && data.seats.some(id => busy.has(id)) ? ' Один из выбранных ПК занят в этом интервале. Нажмите «Снять выбор мест», затем выберите свободные ПК или измените время.' : '';
        mapStatus.textContent = `${context} Свободно: ${freeCount}. Занято: ${busy.size}. Выбрано: ${selectedSeats.size} из ${Number.isInteger(data.players) && data.players > 0 ? data.players : '—'}.${conflictHint}`;
        clearSelection.disabled = selectedSeats.size === 0;
    }

    function refresh() {
        const data = values();
        fields.date.min = today();
        fields.players.max = String(data.zone === 'duo' ? 2 : data.zone ? seats.filter(seat => seat.zone === data.zone).length : 45);
        document.getElementById('booking-summary-tariff').textContent = tariffs.find(item => item.id === data.tariff)?.name || 'Не выбран';
        document.getElementById('booking-summary-zone').textContent = zoneNames[data.zone] || 'Не выбрана';
        document.getElementById('booking-summary-date').textContent = data.date || 'Не выбрана';
        document.getElementById('booking-summary-time').textContent = data.time ? `${data.time} (Астана)` : 'Не выбрано';
        document.getElementById('booking-summary-players').textContent = Number.isInteger(data.players) && data.players > 0 ? String(data.players) : 'Укажите целое число';
        summarySeats.textContent = data.seats.length ? data.seats.map(id => `PC ${id}`).join(', ') : 'Не выбраны';
        summaryDuration.textContent = Number.isInteger(data.duration) && data.duration > 0 ? `${data.duration} ч. (желаемый интервал)` : 'Укажите целое число';
        durationNote.textContent = data.tariff === 'three-hours' ? 'Для пакета «3 часа» продолжительность должна быть ровно 3 часа.' : data.tariff === 'night' || data.tariff === 'private' ? 'От 1 до 12 часов — желаемый интервал для демо-заявки. Это не подтверждение длительности или периода оплаты пакета.' : 'От 1 до 12 полных часов. Для базового тарифа оценка: 1 200 ₸ × часы × игроки.';
        const price = estimate(data);
        totalNote.textContent = price ? price.note : 'Выберите тариф и укажите корректные количество игроков и длительность для оценки.';
        total.textContent = price ? `От ${money(price.amount)}${data.tariff === 'private' ? ' — опубликованный минимум, итог за группу неизвестен' : ' — предварительная оценка'}` : 'Стоимость пока не рассчитана';
        if (!lastAccepted) resultStatus.textContent = 'Итог обновляется при изменении выбора. Для демо-заявки заполните форму и выберите по одному ПК на игрока.';
        updateMap(data);
        if (attempted) validate(false);
    }

    function validate(focusFirst) {
        const data = values();
        const contactErrors = validateContacts(data.name, data.email, data.phone);
        const invalid = [];
        function check(field, message, focusField = field) {
            if (setError(field, message)) invalid.push(focusField);
        }
        check(fields.name, contactErrors.name);
        check(fields.email, contactErrors.email);
        check(fields.phone, contactErrors.phone);
        const dateError = !validDate(data.date) ? 'Выберите корректную дату посещения.' : data.date < today() ? 'Дата посещения не может быть в прошлом по времени Астаны.' : '';
        check(fields.date, dateError);
        const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(data.time);
        check(fields.time, !validTime ? 'Укажите время начала по Астане.' : !dateError && localDateTime(data.date, data.time) <= Date.now() ? 'Выбранное время уже прошло. Укажите будущее время по Астане.' : '');
        const capacity = data.zone ? seats.filter(seat => seat.zone === data.zone).length : 45;
        const countError = !Number.isInteger(data.players) || data.players < 1 ? 'Количество игроков должно быть целым числом от 1.' : data.players > capacity ? `В выбранной зоне только ${capacity} демонстрационных ПК.` : data.zone === 'duo' && data.players !== 2 ? 'Зона DUO предназначена для двух игроков: укажите ровно 2.' : '';
        check(fields.players, countError);
        check(duration, !Number.isInteger(data.duration) || data.duration < 1 || data.duration > 12 ? 'Укажите целое количество часов от 1 до 12.' : data.tariff === 'three-hours' && data.duration !== 3 ? 'Для тарифа «3 часа» укажите ровно 3 часа.' : '');
        check(fields.tariff, !tariffs.some(tariff => tariff.id === data.tariff) ? 'Выберите тариф из списка.' : data.zone && ((data.zone === 'private') !== (data.tariff === 'private')) ? 'Для зоны PRIVATE нужен тариф PRIVATE; этот тариф применяется только к PRIVATE.' : '');
        check(zoneFieldset, data.zone ? '' : 'Выберите игровую зону или свободный ПК на карте.', zoneRadios[0]);
        const requestedInterval = interval(data.date, data.time, data.duration);
        const busy = occupiedSeats(requestedInterval);
        const duplicate = lastAccepted && lastAccepted.fingerprint === JSON.stringify(data) && reservations.some(item => item.id === lastAccepted.id);
        let seatError = data.seats.length !== data.players ? `Выберите ровно ${Number.isInteger(data.players) && data.players > 0 ? data.players : 'по одному'} ПК: сейчас выбрано ${data.seats.length}.` : data.seats.some(id => seats.find(seat => seat.id === id)?.zone !== data.zone) ? 'Все выбранные ПК должны находиться в одной выбранной зоне.' : '';
        if (!seatError && !duplicate && requestedInterval && data.seats.some(id => busy.has(id))) seatError = 'Выбранный ПК занят в пересекающееся время на демо-схеме. Снимите выбор и выберите свободные места или другой интервал.';
        check(map, seatError);
        check(fields.comment, data.comment.length > 1000 ? 'Сократите комментарий до 1 000 символов.' : '');
        check(fields.agreement, fields.agreement.checked ? '' : 'Подтвердите правильность данных.');
        notify(errors, invalid.length ? `Проверьте поля: ${invalid.length}. Подсказки находятся рядом с каждым полем.${lastAccepted ? ' Предыдущий принятый демо-запрос сохранён.' : ''}` : '', 'error');
        if (focusFirst && invalid.length) invalid[0].focus();
        return invalid.length === 0;
    }

    function renderReservations() {
        renderList(localList, reservations, item => {
            const row = el('li', 'list-group-item');
            const body = el('div', 'd-flex flex-wrap align-items-start justify-content-between gap-2');
            const details = el('div', 'text-break');
            details.append(el('strong', 'd-block', `${zoneNames[item.zone]} · ${item.date}, ${item.time} · ${item.duration} ч.`), el('span', 'd-block small', item.seats.map(id => `PC ${id}`).join(', ')), el('span', 'd-block small text-body-secondary text-break', item.id));
            const cancel = el('button', 'btn btn-outline-danger btn-sm', 'Отменить демо-заявку');
            cancel.type = 'button';
            cancel.dataset.cancelBooking = item.id;
            cancel.setAttribute('aria-label', `Отменить демо-заявку ${item.id}`);
            cancel.addEventListener('click', () => cancelReservation(item.id));
            body.append(details, cancel);
            row.append(body);
            return row;
        }, 'Демо-заявок пока нет. После успешной проверки новая заявка появится здесь.');
    }

    function cancelReservation(id) {
        if (storageAvailable) reservations = readReservations();
        if (!reservations.some(item => item.id === id)) {
            notify(localStatus, 'Эта демо-заявка уже отменена. Список обновлён.');
            renderReservations();
            refresh();
            localStatus.focus();
            return;
        }
        reservations = reservations.filter(item => item.id !== id);
        const saved = store.set('bookings', reservations);
        storageAvailable = saved;
        notify(localStatus, `Демо-заявка ${id} отменена, места освобождены на учебной схеме.${saved ? '' : ' Браузер не разрешил сохранение; изменение действует до перезагрузки.'}`);
        if (lastAccepted?.id === id) {
            lastAccepted = null;
            notify(success, 'Последняя демо-заявка отменена. Можно подготовить новую.');
            list.replaceChildren();
            list.classList.add('hidden');
        }
        renderReservations();
        refresh();
        localStatus.focus();
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (storageAvailable) reservations = readReservations();
        attempted = true;
        if (!validate(true)) {
            updateMap(values());
            return;
        }
        const data = values();
        const fingerprint = JSON.stringify(data);
        if (lastAccepted?.fingerprint === fingerprint && reservations.some(item => item.id === lastAccepted.id)) {
            resultStatus.textContent = 'Этот демо-запрос уже принят в этом браузере. Повторная заявка не создана.';
            return;
        }
        const requestedInterval = interval(data.date, data.time, data.duration);
        const id = reference('BOOK');
        const entry = { id, date: data.date, time: data.time, duration: data.duration, seats: data.seats, zone: data.zone, tariff: data.tariff, ...requestedInterval };
        reservations.push(entry);
        const saved = store.set('bookings', reservations);
        storageAvailable = saved;
        lastAccepted = { id, data: { ...data, ...requestedInterval }, fingerprint };
        const price = estimate(data);
        const confirmation = [
            `Игрок: ${data.name}`, `Контакты: ${data.email}; ${data.phone}`,
            `Зона: ${zoneNames[data.zone]}; ПК: ${data.seats.join(', ')}; игроков: ${data.players}`,
            `Визит: ${data.date}, ${data.time} по Астане; желаемая длительность: ${data.duration} ч.`,
            `Тариф: ${tariffs.find(tariff => tariff.id === data.tariff).name}; ${data.tariff === 'private' ? 'опубликованный минимум' : 'предварительная оценка'}: от ${money(price.amount)}`,
            `Наушники: ${data.headphones ? 'нужны' : 'не запрошены'}`
        ];
        if (data.comment) confirmation.push(`Комментарий: ${data.comment}`);
        if (data.tariff === 'night' || data.tariff === 'private') confirmation.push('Условия пакета и окончательную стоимость необходимо уточнить у клуба.');
        renderList(list, confirmation, text => el('li', 'list-group-item text-break', text));
        list.classList.remove('hidden');
        notify(success, `Демо-заявка ${id} сохранена ${saved ? 'в этом браузере' : 'до перезагрузки страницы: сохранение браузером недоступно'}. Контакты не сохраняются и не отправляются. Реальное бронирование и оплата не создаются.`, 'success');
        resultStatus.textContent = 'Проверка пройдена. Принятый запрос показан ниже; текущий выбор можно изменить для следующего запроса.';
        renderReservations();
        updateMap(data);
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    form.addEventListener('input', event => {
        if (event.target.matches('input, textarea')) refresh();
    });
    form.addEventListener('change', event => {
        if (event.target === fields.tariff && fields.tariff.value === 'three-hours') duration.value = '3';
        if (event.target.matches('[name="gaming-zone"]')) {
            const removed = selectedSeats.size;
            selectedSeats.clear();
            if (event.target.value === 'duo') fields.players.value = '2';
            notify(mapFeedback, `Выбрана зона ${zoneNames[event.target.value]}.${removed ? ' Предыдущий выбор ПК очищен.' : ''} Выберите компьютеры на карте.`);
        }
        refresh();
    });
    form.addEventListener('reset', event => {
        event.preventDefault();
        form.querySelectorAll('input').forEach(field => {
            if (field.type === 'radio' || field.type === 'checkbox') field.checked = false;
            else field.value = field === fields.players || field === duration ? '1' : '';
        });
        fields.tariff.value = '';
        fields.comment.value = '';
        selectedSeats.clear();
        lastAccepted = null;
        attempted = false;
        clearErrors(form);
        notify(errors, '');
        notify(success, '');
        notify(mapFeedback, 'Форма и выбор ПК очищены. Сохранённые демо-заявки можно отменить в списке ниже.');
        list.replaceChildren();
        list.classList.add('hidden');
        refresh();
        fields.name.focus();
    });

    window.addEventListener('storage', event => {
        if (event.key !== 'topgame-bookings' && event.key !== null) return;
        reservations = readReservations();
        if (lastAccepted && !reservations.some(item => item.id === lastAccepted.id)) {
            lastAccepted = null;
            notify(success, 'Предыдущая демо-заявка удалена в другой вкладке.');
            list.replaceChildren();
            list.classList.add('hidden');
        }
        notify(localStatus, 'Список демо-заявок и занятость обновлены после изменения в другой вкладке.');
        renderReservations();
        refresh();
    });

    const params = new URLSearchParams(window.location.search);
    if (tariffs.some(tariff => tariff.id === params.get('tariff'))) fields.tariff.value = params.get('tariff');
    const initialZone = params.get('zone') || (fields.tariff.value === 'private' ? 'private' : '');
    if (Object.hasOwn(zoneNames, initialZone)) chooseZone(initialZone);
    const initialPlayers = Number(params.get('players'));
    if (Number.isInteger(initialPlayers) && initialPlayers >= 1 && initialPlayers <= 45) fields.players.value = String(initialPlayers);
    const initialDuration = Number(params.get('hours'));
    if (Number.isInteger(initialDuration) && initialDuration >= 1 && initialDuration <= 12) duration.value = String(initialDuration);
    if (fields.tariff.value === 'three-hours') duration.value = '3';
    const initialDate = params.get('date') || '';
    if (validDate(initialDate) && initialDate >= today()) fields.date.value = initialDate;
    if (params.get('game')) fields.comment.value = `Предпочтительная игра: ${params.get('game').slice(0, 150)}`;
    reservations = readReservations();
    renderReservations();
    refresh();
})();
