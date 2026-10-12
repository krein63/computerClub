'use strict';

(() => {
    const form = document.getElementById('booking-form');
    if (!form) return;

    const { el, money, reference, today, localDateTime, store, renderList, setError, clearErrors, validateContacts, notify, estimateVisit, tariffs, seats } = window.TopGame;
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
    let selectedSeats = []; // Номера выбранных компьютеров.
    const seatButtons = {}; // Кнопки карты по номеру ПК.
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
    fields.players.max = String(seats.length);
    for (const field of [fields.name, fields.email, fields.phone, fields.players, fields.tariff]) {
        field.closest('p').classList.replace('col-md-6', 'col-md-4');
    }
    document.getElementById('booking-submit').type = 'submit';
    document.getElementById('booking-submit').textContent = 'Отправить заявку';
    document.getElementById('booking-submit-guard').remove();
    formStatus.textContent = 'Укажите время по Астане, выберите любые свободные ПК и заполните контакты. Брони сохраняются в этом браузере. Для подтверждения в клубе: +7 706 400 50 40.';
    document.querySelector('#booking-introduction > p:nth-of-type(3)').textContent = 'Выберите компьютеры в одной или нескольких зонах, проверьте стоимость и сохраните бронь в этом браузере.';
    document.querySelector('#booking-result > p.small').textContent = 'Брони сохраняются в этом браузере. Контакты не сохраняются и не отправляются в клуб.';
    document.getElementById('booking-figure-1').classList.add('hidden');

    const durationWrapper = el('p', 'mb-3 col-12 col-md-4');
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
    document.getElementById('booking-tariff-note').textContent = 'Цена пакета рассчитывается на каждый выбранный ПК. Компьютеры можно выбирать в разных зонах.';
    const emptyTariff = el('option', '', 'Выберите тариф');
    emptyTariff.value = '';
    fields.tariff.replaceChildren(emptyTariff);
    for (const tariff of tariffs) {
        const option = el('option', '', `${tariff.name} — ${money(tariff.price)}${tariff.hourly ? '/час' : ''}`);
        option.value = tariff.id;
        fields.tariff.append(option);
    }
    zoneFieldset.querySelector('legend').textContent = 'Предпочтительная зона';
    zoneFieldset.querySelector('p').textContent = 'Можно выбрать ПК сразу в нескольких зонах:';
    zoneRadios.forEach(radio => {
        radio.required = false;
        radio.closest('p').classList.add('col-md-4');
    });

    const map = el('fieldset', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mb-4');
    map.id = 'seat-map';
    map.tabIndex = -1;
    const mapLegend = el('legend', 'h4 fw-bold mb-3', 'Выберите компьютеры на карте');
    const zoneCapacityText = Object.keys(zoneNames).map(zone => `${zoneNames[zone]} — ${seats.filter(seat => seat.zone === zone).length}`).join(', ');
    const mapExplanation = el('p', 'small text-body-secondary mb-3', `${seats.length} ПК: ${zoneCapacityText}. Выбирайте любое число свободных мест. Занятость учитывает брони, сохранённые в этом браузере.`);
    const legend = el('div', 'd-flex flex-wrap gap-2 mb-3');
    legend.setAttribute('aria-label', 'Условные обозначения');
    legend.append(el('span', 'badge bg-white text-dark border border-dark', 'Свободно'), el('span', 'badge text-bg-secondary', 'Занято'), el('span', 'badge text-bg-danger', 'Выбрано'));
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
        const zoneCard = el('section', 'bg-white border rounded-3 p-2 p-md-3 h-100');
        const zoneSeats = seats.filter(seat => seat.zone === zone);
        const heading = el('h3', 'h6 fw-bold mb-3', `${zoneNames[zone]} · ${zoneSeats.length} ПК · этаж ${zoneSeats[0].floor}`);
        const grid = el('div', 'row row-cols-2 row-cols-sm-5 g-2');
        for (const seat of zoneSeats) {
            const column = el('div', zoneSeats.length % 2 !== 0 && seat.id === zoneSeats[zoneSeats.length - 1].id ? 'col-12 col-sm' : 'col');
            const button = el('button', 'btn btn-outline-dark w-100 h-100 px-1 py-2');
            button.id = `seat-${seat.id}`;
            button.type = 'button';
            button.dataset.seatId = String(seat.id);
            button.dataset.zone = seat.zone;
            button.setAttribute('aria-pressed', 'false');
            const number = el('span', 'd-block fw-bold', `▰ PC ${String(seat.id).padStart(2, '0')}`);
            const status = el('span', 'd-block small', 'Свободно');
            button.append(number, status);
            button.addEventListener('click', () => toggleSeat(seat));
            seatButtons[seat.id] = { button, status };
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
        selectedSeats = [];
        fields.players.value = '1';
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
    const localTitle = el('h3', 'h5 fw-bold mb-3', 'Мои брони в этом браузере');
    localTitle.id = 'local-bookings-title';
    const localStatus = el('p', 'small mb-3', 'При пересечении времени один и тот же ПК нельзя выбрать дважды. Отмена освобождает место. Контакты не сохраняются.');
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
            if (!item || typeof item.id !== 'string' || item.id.length > 80 || !tariffs.some(tariff => tariff.id === item.tariff)) return false;
            const requested = interval(item.date, item.time, item.duration);
            return requested && requested.start === item.start && requested.end === item.end && Array.isArray(item.seats) && item.seats.length > 0 && item.seats.length <= seats.length && item.seats.every((id, index) => item.seats.indexOf(id) === index) && item.seats.every(id => seats.some(seat => seat.id === id));
        });
    }

    function displayId(id) {
        return id.replace(/^DEMO-/, 'TG-');
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
        if (!requestedInterval) return [];
        const busy = [];
        function addBusy(id) {
            if (!busy.includes(id)) busy.push(id);
        }
        reservations.filter(item => overlaps(requestedInterval, item)).forEach(item => item.seats.forEach(id => addBusy(id)));
        return busy;
    }

    function chooseZone(zone) {
        zoneRadios.forEach(radio => { radio.checked = radio.value === zone; });
    }

    function toggleSeat(seat) {
        const data = values();
        if (occupiedSeats(interval(data.date, data.time, data.duration)).includes(seat.id)) return;
        if (selectedSeats.includes(seat.id)) {
            selectedSeats = selectedSeats.filter(id => id !== seat.id);
            notify(mapFeedback, `PC ${seat.id} исключён из выбора.`);
        } else {
            selectedSeats.push(seat.id);
            notify(mapFeedback, `PC ${seat.id} добавлен в выбор.`);
        }
        fields.players.value = String(selectedSeats.length || 1);
        refresh();
    }

    function selectedZoneNames(ids) {
        const names = [];
        for (const id of ids) {
            const seat = seats.find(item => item.id === id);
            if (seat && !names.includes(zoneNames[seat.zone])) names.push(zoneNames[seat.zone]);
        }
        return names.join(', ');
    }

    function estimate(data) {
        return estimateVisit(tariffs, data.tariff, data.duration, data.players);
    }

    function updateMap(data) {
        const requestedInterval = interval(data.date, data.time, data.duration);
        const busy = occupiedSeats(requestedInterval);
        for (const seat of seats) {
            const { button, status } = seatButtons[seat.id];
            const occupied = busy.includes(seat.id);
            const selected = selectedSeats.includes(seat.id);
            const state = occupied ? 'occupied' : selected ? 'selected' : 'available';
            button.disabled = occupied;
            button.dataset.seatState = state;
            button.classList.toggle('btn-outline-light', state === 'available');
            button.classList.toggle('btn-secondary', state === 'occupied');
            button.classList.toggle('opacity-100', state === 'occupied');
            button.classList.toggle('btn-danger', state === 'selected');
            button.classList.toggle('text-white', state !== 'available');
            button.classList.toggle('selected', state === 'selected');
            button.setAttribute('aria-pressed', String(selected));
            const ownRequest = occupied && selected && lastAccepted?.data.seats.includes(seat.id) && requestedInterval && overlaps(requestedInterval, lastAccepted.data);
            status.textContent = ownRequest ? 'Ваш запрос' : occupied ? 'Занято' : selected ? 'Выбрано' : 'Свободно';
            button.setAttribute('aria-label', `PC ${seat.id}, зона ${zoneNames[seat.zone]}, ${status.textContent.toLowerCase()}`);
        }
        const freeCount = seats.length - busy.length;
        const context = requestedInterval ? `${data.date}, ${data.time}, ${data.duration} ч. по Астане.` : 'Укажите дату, время и длительность для проверки занятости.';
        const sameAcceptedChoice = lastAccepted?.fingerprint === JSON.stringify(data);
        const conflictHint = requestedInterval && !sameAcceptedChoice && data.seats.some(id => busy.includes(id)) ? ' Один из выбранных ПК занят в этом интервале. Нажмите «Снять выбор мест», затем выберите свободные ПК или измените время.' : '';
        mapStatus.textContent = `${context} Свободно: ${freeCount}. Занято: ${busy.length}. Выбрано: ${selectedSeats.length} из ${Number.isInteger(data.players) && data.players > 0 ? data.players : '—'}.${conflictHint}`;
        clearSelection.disabled = selectedSeats.length === 0;
    }

    function refresh() {
        const data = values();
        fields.date.min = today();
        document.getElementById('booking-summary-tariff').textContent = tariffs.find(item => item.id === data.tariff)?.name || 'Не выбран';
        document.getElementById('booking-summary-zone').textContent = selectedZoneNames(data.seats) || zoneNames[data.zone] || 'Не выбрана';
        document.getElementById('booking-summary-date').textContent = data.date || 'Не выбрана';
        document.getElementById('booking-summary-time').textContent = data.time ? `${data.time} (Астана)` : 'Не выбрано';
        document.getElementById('booking-summary-players').textContent = Number.isInteger(data.players) && data.players > 0 ? String(data.players) : 'Укажите целое число';
        summarySeats.textContent = data.seats.length ? data.seats.map(id => `PC ${id}`).join(', ') : 'Не выбраны';
        summaryDuration.textContent = Number.isInteger(data.duration) && data.duration > 0 ? `${data.duration} ч.` : 'Укажите целое число';
        const tariff = tariffs.find(item => item.id === data.tariff);
        durationNote.textContent = tariff && !tariff.hourly ? `Пакет «${tariff.name}» включает ${tariff.duration} ч. на каждый ПК.` : 'От 1 до 12 полных часов. Стоимость: тариф × часы × количество ПК.';
        const price = estimate(data);
        totalNote.textContent = price ? 'Стоимость пакета для всех выбранных компьютеров.' : 'Выберите тариф и укажите количество игроков и длительность.';
        total.textContent = price ? money(price.amount) : 'Стоимость пока не рассчитана';
        if (!lastAccepted) resultStatus.textContent = 'Итог обновляется при изменении выбора. Заполните форму и выберите по одному ПК на игрока.';
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
        const countError = !Number.isInteger(data.players) || data.players < 1 || data.players > seats.length ? `Укажите целое количество игроков от 1 до ${seats.length}.` : '';
        check(fields.players, countError);
        const tariff = tariffs.find(item => item.id === data.tariff);
        check(duration, !Number.isInteger(data.duration) || data.duration < 1 || data.duration > 12 ? 'Укажите целое количество часов от 1 до 12.' : tariff && !tariff.hourly && data.duration !== tariff.duration ? `Пакет «${tariff.name}» рассчитан на ${tariff.duration} ч.` : '');
        check(fields.tariff, tariff ? '' : 'Выберите тариф из списка.');
        const requestedInterval = interval(data.date, data.time, data.duration);
        const busy = occupiedSeats(requestedInterval);
        const duplicate = lastAccepted && lastAccepted.fingerprint === JSON.stringify(data) && reservations.some(item => item.id === lastAccepted.id);
        let seatError = data.seats.length !== data.players ? `Выберите ровно ${Number.isInteger(data.players) && data.players > 0 ? data.players : 'по одному'} ПК: сейчас выбрано ${data.seats.length}.` : '';
        if (!seatError && !duplicate && requestedInterval && data.seats.some(id => busy.includes(id))) seatError = 'Выбранный ПК занят в пересекающееся время. Снимите выбор и выберите свободные места или другой интервал.';
        check(map, seatError);
        check(fields.comment, data.comment.length > 1000 ? 'Сократите комментарий до 1 000 символов.' : '');
        check(fields.agreement, fields.agreement.checked ? '' : 'Подтвердите правильность данных.');
        notify(errors, invalid.length ? `Проверьте поля: ${invalid.length}. Подсказки находятся рядом с каждым полем.${lastAccepted ? ' Предыдущая бронь сохранена.' : ''}` : '', 'error');
        if (focusFirst && invalid.length) invalid[0].focus();
        return invalid.length === 0;
    }

    function renderReservations() {
        renderList(localList, reservations, item => {
            const row = el('li', 'list-group-item bg-dark text-light border-secondary');
            const body = el('div', 'd-flex flex-wrap align-items-start justify-content-between gap-2');
            const details = el('div', 'text-break');
            details.append(el('strong', 'd-block', `${selectedZoneNames(item.seats)} · ${item.date}, ${item.time} · ${item.duration} ч.`), el('span', 'd-block small', item.seats.map(id => `PC ${id}`).join(', ')), el('span', 'd-block small text-body-secondary text-break', displayId(item.id)));
            const cancel = el('button', 'btn btn-outline-light btn-sm', 'Отменить бронь');
            cancel.type = 'button';
            cancel.dataset.cancelBooking = item.id;
            cancel.setAttribute('aria-label', `Отменить бронь ${displayId(item.id)}`);
            cancel.addEventListener('click', () => cancelReservation(item.id));
            body.append(details, cancel);
            row.append(body);
            return row;
        }, 'Броней пока нет. После отправки новая заявка появится здесь.');
    }

    function cancelReservation(id) {
        if (storageAvailable) reservations = readReservations();
        if (!reservations.some(item => item.id === id)) {
            notify(localStatus, 'Эта бронь уже отменена. Список обновлён.');
            renderReservations();
            refresh();
            localStatus.focus();
            return;
        }
        reservations = reservations.filter(item => item.id !== id);
        const saved = store.set('bookings', reservations);
        storageAvailable = saved;
        notify(localStatus, `Бронь ${displayId(id)} отменена, места освобождены.${saved ? '' : ' Браузер не разрешил сохранение; изменение действует до перезагрузки.'}`);
        if (lastAccepted?.id === id) {
            lastAccepted = null;
            notify(success, 'Последняя бронь отменена. Можно подготовить новую.');
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
            resultStatus.textContent = 'Эта заявка уже сохранена в этом браузере. Повторная бронь не создана.';
            return;
        }
        const requestedInterval = interval(data.date, data.time, data.duration);
        const id = reference('BOOK');
        const chosenZones = [...new Set(data.seats.map(seatId => seats.find(seat => seat.id === seatId).zone))];
        const entry = { id, date: data.date, time: data.time, duration: data.duration, seats: data.seats, zone: chosenZones.length === 1 ? chosenZones[0] : 'mixed', tariff: data.tariff, ...requestedInterval };
        reservations.push(entry);
        const saved = store.set('bookings', reservations);
        storageAvailable = saved;
        lastAccepted = { id, data: { ...data, ...requestedInterval }, fingerprint };
        const price = estimate(data);
        const confirmation = [
            `Игрок: ${data.name}`, `Контакты: ${data.email}; ${data.phone}`,
            `Зоны: ${selectedZoneNames(data.seats)}; ПК: ${data.seats.join(', ')}; игроков: ${data.players}`,
            `Визит: ${data.date}, ${data.time} по Астане; длительность: ${data.duration} ч.`,
            `Тариф: ${tariffs.find(tariff => tariff.id === data.tariff).name}; стоимость: ${money(price.amount)}`,
            `Наушники: ${data.headphones ? 'нужны' : 'не запрошены'}`
        ];
        if (data.comment) confirmation.push(`Комментарий: ${data.comment}`);
        renderList(list, confirmation, text => el('li', 'list-group-item bg-dark text-light border-secondary text-break', text));
        list.classList.remove('hidden');
        notify(success, `Заявка ${displayId(id)} сохранена ${saved ? 'в этом браузере' : 'до перезагрузки страницы: сохранение браузером недоступно'}.`, 'success');
        resultStatus.textContent = 'Проверка пройдена. Принятый запрос показан ниже; текущий выбор можно изменить для следующего запроса.';
        renderReservations();
        updateMap(data);
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    form.addEventListener('input', event => {
        if (event.target.matches('input, textarea')) refresh();
    });
    form.addEventListener('change', event => {
        if (event.target === fields.tariff) {
            const tariff = tariffs.find(item => item.id === fields.tariff.value);
            if (tariff && !tariff.hourly) duration.value = String(tariff.duration);
        }
        if (event.target.matches('[name="gaming-zone"]')) {
            notify(mapFeedback, `Предпочтительная зона: ${zoneNames[event.target.value]}. Выбранные ПК сохранены, можно добавить места из любой зоны.`);
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
        selectedSeats = [];
        lastAccepted = null;
        attempted = false;
        clearErrors(form);
        notify(errors, '');
        notify(success, '');
        notify(mapFeedback, 'Форма и выбор ПК очищены. Сохранённые брони можно отменить в списке ниже.');
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
            notify(success, 'Предыдущая бронь удалена в другой вкладке.');
            list.replaceChildren();
            list.classList.add('hidden');
        }
        notify(localStatus, 'Список броней и занятость обновлены после изменения в другой вкладке.');
        renderReservations();
        refresh();
    });

    const params = new URLSearchParams(window.location.search);
    if (tariffs.some(tariff => tariff.id === params.get('tariff'))) fields.tariff.value = params.get('tariff');
    const initialZone = params.get('zone') || (fields.tariff.value === 'private' ? 'private' : '');
    if (Object.hasOwn(zoneNames, initialZone)) chooseZone(initialZone);
    const initialPlayers = Number(params.get('players'));
    if (Number.isInteger(initialPlayers) && initialPlayers >= 1 && initialPlayers <= seats.length) fields.players.value = String(initialPlayers);
    const initialDuration = Number(params.get('hours'));
    if (Number.isInteger(initialDuration) && initialDuration >= 1 && initialDuration <= 12) duration.value = String(initialDuration);
    const initialTariff = tariffs.find(item => item.id === fields.tariff.value);
    if (initialTariff && !initialTariff.hourly) duration.value = String(initialTariff.duration);
    const initialDate = params.get('date') || '';
    if (validDate(initialDate) && initialDate >= today()) fields.date.value = initialDate;
    if (params.get('game')) fields.comment.value = `Предпочтительная игра: ${params.get('game').slice(0, 150)}`;
    reservations = readReservations();
    renderReservations();
    refresh();
})();
