'use strict';

function setupBooking() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    const app = window.TopGame;
    const el = app.el;
    const money = app.money;
    const reference = app.reference;
    const today = app.today;
    const localDateTime = app.localDateTime;
    const store = app.store;
    const renderList = app.renderList;
    const setError = app.setError;
    const clearErrors = app.clearErrors;
    const validateContacts = app.validateContacts;
    const notify = app.notify;
    const tariffs = app.tariffs;
    const seats = app.seats;

    // 1. Получаем готовые элементы из HTML и запоминаем выбор пользователя.
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
    const duration = document.getElementById('booking-duration');
    const durationNote = document.getElementById('booking-duration-note');
    const zoneFieldset = document.getElementById('gaming-zone-selection');
    const zoneRadios = form.querySelectorAll('[name="gaming-zone"]');
    const zoneNames = { main: 'MAIN', duo: 'DUO', private: 'PRIVATE' };
    const snapshotOccupied = [3, 4, 8, 12, 17];
    const map = document.getElementById('seat-map');
    const mapStatus = document.getElementById('seat-map-status');
    const mapFeedback = document.getElementById('seat-map-feedback');
    const clearSelection = document.getElementById('clear-seat-selection');
    const summarySeats = document.getElementById('booking-summary-seats');
    const summaryDuration = document.getElementById('booking-summary-duration');
    const totalNote = document.getElementById('booking-total-note');
    const total = document.getElementById('booking-total');
    const resultStatus = document.getElementById('booking-result-status');
    const list = document.getElementById('booking-result-list');
    const success = document.getElementById('booking-success');
    const errors = document.getElementById('booking-errors');
    const localStatus = document.getElementById('local-bookings-status');
    const localList = document.getElementById('local-bookings');
    let selectedSeats = [];
    let reservations = [];
    let lastAccepted = null;
    let attempted = false;
    let storageAvailable = true;

    for (const seat of seats) {
        document.getElementById('seat-' + seat.id).addEventListener('click', function () {
            toggleSeat(seat);
        });
    }
    clearSelection.addEventListener('click', function () {
        selectedSeats = [];
        notify(mapFeedback, 'Выбор ПК очищен. Выберите места для нового запроса.');
        refresh();
    });

    // 2. Проверяем дату и пересечения сеансов.
    function validDate(date) {
        if (typeof date !== 'string') return false;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        const parts = date.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        const calendarDate = new Date(Date.UTC(year, month - 1, day));
        return calendarDate.getUTCFullYear() === year && calendarDate.getUTCMonth() === month - 1 && calendarDate.getUTCDate() === day;
    }

    function interval(date, time, hours) {
        if (typeof time !== 'string') return null;
        if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isInteger(hours) || hours < 1 || hours > 12) return null;
        const start = localDateTime(date, time);
        if (!Number.isFinite(start)) return null;
        return { start: start, end: start + hours * 60 * 60 * 1000 };
    }

    function overlaps(first, second) {
        return first.start < second.end && first.end > second.start;
    }

    function readReservations() {
        const saved = store.get('bookings', []);
        const result = [];
        if (!Array.isArray(saved)) return result;
        for (const item of saved) {
            if (!item || typeof item.id !== 'string' || item.id.length > 80) continue;
            if (!zoneNames[item.zone] || !app.findProduct(tariffs, item.tariff)) continue;
            const requested = interval(item.date, item.time, item.duration);
            if (!requested || requested.start !== item.start || requested.end !== item.end) continue;
            if (!Array.isArray(item.seats) || item.seats.length === 0) continue;
            let correctSeats = true;
            for (let index = 0; index < item.seats.length; index++) {
                const id = item.seats[index];
                const seat = app.findProduct(seats, id);
                if (!seat || seat.zone !== item.zone || item.seats.indexOf(id) !== index) {
                    correctSeats = false;
                }
            }
            if (correctSeats) result.push(item);
        }
        return result;
    }

    function zoneCapacity(zone) {
        if (!zone) return seats.length;
        let count = 0;
        for (const seat of seats) {
            if (seat.zone === zone) count++;
        }
        return count;
    }

    function seatNames(ids) {
        const names = [];
        for (const id of ids) names.push('PC ' + id);
        return names.join(', ');
    }

    function acceptedRequestExists() {
        if (!lastAccepted) return false;
        return app.findProduct(reservations, lastAccepted.id) !== null;
    }

    function sameRequest(data) {
        return acceptedRequestExists() && lastAccepted.fingerprint === JSON.stringify(data);
    }

    function values() {
        let zone = '';
        for (const radio of zoneRadios) {
            if (radio.checked) zone = radio.value;
        }
        return {
            name: fields.name.value.trim(), email: fields.email.value.trim(), phone: fields.phone.value.trim(),
            date: fields.date.value, time: fields.time.value, players: Number(fields.players.value),
            tariff: fields.tariff.value, duration: Number(duration.value), zone,
            seats: selectedSeats.slice().sort(function (first, second) { return first - second; }),
            headphones: document.getElementById('headphones').checked, comment: fields.comment.value.trim()
        };
    }

    function occupiedSeats(requestedInterval) {
        if (!requestedInterval) return snapshotOccupied.slice();
        const busy = [];
        // Учебный сеанс сегодня с 18:00 до 21:00 показывает занятость.
        const sampleSession = interval(today(), '18:00', 3);
        if (overlaps(requestedInterval, sampleSession)) {
            for (const id of snapshotOccupied) busy.push(id);
        }
        for (const item of reservations) {
            if (!overlaps(requestedInterval, item)) continue;
            for (const id of item.seats) {
                if (!busy.includes(id)) busy.push(id);
            }
        }
        return busy;
    }

    function chooseZone(zone) {
        for (const radio of zoneRadios) radio.checked = radio.value === zone;
        selectedSeats = [];
        if (zone === 'duo') fields.players.value = '2';
    }

    function toggleSeat(seat) {
        const data = values();
        if (occupiedSeats(interval(data.date, data.time, data.duration)).includes(seat.id)) return;
        let switched = false;
        if (data.zone !== seat.zone) {
            switched = selectedSeats.length > 0;
            chooseZone(seat.zone);
        }
        if (selectedSeats.includes(seat.id)) {
            selectedSeats.splice(selectedSeats.indexOf(seat.id), 1);
            notify(mapFeedback, `PC ${seat.id} исключён из выбора.`);
        } else {
            const count = Number(fields.players.value);
            if (Number.isInteger(count) && count > 0 && selectedSeats.length >= count) {
                notify(mapFeedback, `Для ${count} игроков уже выбрано ${count} ПК. Снимите один выбор или увеличьте количество игроков.`, 'error');
                return;
            }
            selectedSeats.push(seat.id);
            let message = 'PC ' + seat.id + ' добавлен в выбор.';
            if (switched) message = 'Выбрана другая зона, предыдущие ПК сняты. ' + message;
            notify(mapFeedback, message);
        }
        refresh();
    }

    // 3. Считаем цену и обновляем карту и предварительный итог.
    function estimate(data) {
        const tariff = app.findProduct(tariffs, data.tariff);
        if (!tariff || !app.validQuantity(data.players, zoneCapacity(data.zone))) return null;
        if (!app.validQuantity(data.duration, 12)) return null;
        if (tariff.id === 'three-hours' && data.duration !== 3) return null;
        if (data.zone === 'private' && tariff.id !== 'private') return null;
        if (data.zone && data.zone !== 'private' && tariff.id === 'private') return null;
        if (data.zone === 'duo' && data.players !== 2) return null;
        let amount = tariff.price;
        let note = 'Опубликованный минимум PRIVATE. Период оплаты и единица тарификации не указаны; итог за группу и выбранную длительность уточняется в клубе.';
        if (tariff.id !== 'private') {
            amount *= data.players;
            note = 'Предварительная оценка по опубликованным ценам «от» за каждого игрока. Итоговую стоимость подтвердит клуб.';
        }
        if (tariff.id === 'hour') amount *= data.duration;
        if (tariff.id === 'night') note = 'Оценка по цене ночного пакета на игрока. Его часы и соответствие желаемой длительности уточняются в клубе.';
        return { amount: amount, note: note };
    }

    function updateMap(data) {
        const requestedInterval = interval(data.date, data.time, data.duration);
        const busy = occupiedSeats(requestedInterval);
        let hasConflict = false;
        for (const seat of seats) {
            const button = document.getElementById('seat-' + seat.id);
            const status = button.lastElementChild;
            const occupied = busy.includes(seat.id);
            const selected = selectedSeats.includes(seat.id);
            let state = 'available';
            status.textContent = 'Свободно';
            if (selected) {
                state = 'selected';
                status.textContent = 'Выбрано';
            }
            if (occupied) {
                state = 'occupied';
                status.textContent = 'Занято';
                if (selected) hasConflict = true;
                if (selected && lastAccepted && lastAccepted.data.seats.includes(seat.id)
                    && requestedInterval && overlaps(requestedInterval, lastAccepted.data)) {
                    status.textContent = 'Ваш запрос';
                }
            }
            button.disabled = occupied;
            button.dataset.seatState = state;
            button.classList.toggle('btn-outline-light', state === 'available');
            button.classList.toggle('btn-secondary', state === 'occupied');
            button.classList.toggle('opacity-100', state === 'occupied');
            button.classList.toggle('btn-danger', state === 'selected');
            button.classList.toggle('text-white', state !== 'available');
            button.classList.toggle('selected', state === 'selected');
            button.setAttribute('aria-pressed', String(selected));
            button.setAttribute('aria-label', `PC ${seat.id}, зона ${zoneNames[seat.zone]}, ${status.textContent.toLowerCase()}`);
        }
        let context = 'Демоснимок: укажите дату, время и длительность для проверки пересечений.';
        if (requestedInterval) context = `${data.date}, ${data.time}, ${data.duration} ч. по Астане.`;
        let playerCount = '—';
        if (Number.isInteger(data.players) && data.players > 0) playerCount = data.players;
        mapStatus.textContent = `${context} Свободно: ${seats.length - busy.length}. Занято: ${busy.length}. Выбрано: ${selectedSeats.length} из ${playerCount}.`;
        if (requestedInterval && !sameRequest(data) && hasConflict) {
            mapStatus.textContent += ' Один из выбранных ПК занят в этом интервале. Нажмите «Снять выбор мест», затем выберите свободные ПК или измените время.';
        }
        clearSelection.disabled = selectedSeats.length === 0;
    }

    function refresh() {
        const data = values();
        fields.date.min = today();
        fields.players.max = String(zoneCapacity(data.zone));
        if (data.zone === 'duo') fields.players.max = '2';
        const tariff = app.findProduct(tariffs, data.tariff);
        let tariffName = 'Не выбран';
        if (tariff) tariffName = tariff.name;
        document.getElementById('booking-summary-tariff').textContent = tariffName;
        document.getElementById('booking-summary-zone').textContent = zoneNames[data.zone] || 'Не выбрана';
        document.getElementById('booking-summary-date').textContent = data.date || 'Не выбрана';
        document.getElementById('booking-summary-time').textContent = 'Не выбрано';
        if (data.time) document.getElementById('booking-summary-time').textContent = data.time + ' (Астана)';
        document.getElementById('booking-summary-players').textContent = 'Укажите целое число';
        if (Number.isInteger(data.players) && data.players > 0) {
            document.getElementById('booking-summary-players').textContent = data.players;
        }
        summarySeats.textContent = seatNames(data.seats) || 'Не выбраны';
        summaryDuration.textContent = 'Укажите целое число';
        if (Number.isInteger(data.duration) && data.duration > 0) {
            summaryDuration.textContent = data.duration + ' ч. (желаемый интервал)';
        }
        durationNote.textContent = 'От 1 до 12 полных часов. Для базового тарифа оценка: 1 200 ₸ × часы × игроки.';
        if (data.tariff === 'three-hours') durationNote.textContent = 'Для пакета «3 часа» продолжительность должна быть ровно 3 часа.';
        if (data.tariff === 'night' || data.tariff === 'private') {
            durationNote.textContent = 'От 1 до 12 часов — желаемый интервал для демо-заявки. Это не подтверждение длительности или периода оплаты пакета.';
        }
        const price = estimate(data);
        totalNote.textContent = 'Выберите тариф и укажите корректные количество игроков и длительность для оценки.';
        total.textContent = 'Стоимость пока не рассчитана';
        if (price) {
            totalNote.textContent = price.note;
            total.textContent = 'От ' + money(price.amount) + ' — предварительная оценка';
            if (data.tariff === 'private') total.textContent = 'От ' + money(price.amount) + ' — опубликованный минимум, итог за группу неизвестен';
        }
        if (!lastAccepted) resultStatus.textContent = 'Итог обновляется при изменении выбора. Для демо-заявки заполните форму и выберите по одному ПК на игрока.';
        updateMap(data);
        if (attempted) validate(false);
    }

    // 4. Перед отправкой проверяем каждое поле и показываем ошибки рядом с ним.
    function validate(focusFirst) {
        const data = values();
        const contactErrors = validateContacts(data.name, data.email, data.phone);
        const invalid = [];
        function check(field, message, focusField) {
            if (!focusField) focusField = field;
            if (setError(field, message)) invalid.push(focusField);
        }
        check(fields.name, contactErrors.name);
        check(fields.email, contactErrors.email);
        check(fields.phone, contactErrors.phone);
        let dateError = '';
        if (!validDate(data.date)) dateError = 'Выберите корректную дату посещения.';
        else if (data.date < today()) dateError = 'Дата посещения не может быть в прошлом по времени Астаны.';
        check(fields.date, dateError);
        let timeError = '';
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) timeError = 'Укажите время начала по Астане.';
        else if (!dateError && localDateTime(data.date, data.time) <= Date.now()) timeError = 'Выбранное время уже прошло. Укажите будущее время по Астане.';
        check(fields.time, timeError);
        let countError = '';
        const capacity = zoneCapacity(data.zone);
        if (!Number.isInteger(data.players) || data.players < 1) countError = 'Количество игроков должно быть целым числом от 1.';
        else if (data.players > capacity) countError = `В выбранной зоне только ${capacity} демонстрационных ПК.`;
        else if (data.zone === 'duo' && data.players !== 2) countError = 'Зона DUO предназначена для двух игроков: укажите ровно 2.';
        check(fields.players, countError);
        let durationError = '';
        if (!app.validQuantity(data.duration, 12)) durationError = 'Укажите целое количество часов от 1 до 12.';
        else if (data.tariff === 'three-hours' && data.duration !== 3) durationError = 'Для тарифа «3 часа» укажите ровно 3 часа.';
        check(duration, durationError);
        let tariffError = '';
        if (!app.findProduct(tariffs, data.tariff)) tariffError = 'Выберите тариф из списка.';
        else if (data.zone === 'private' && data.tariff !== 'private') tariffError = 'Для зоны PRIVATE нужен тариф PRIVATE; этот тариф применяется только к PRIVATE.';
        else if (data.zone && data.zone !== 'private' && data.tariff === 'private') tariffError = 'Для зоны PRIVATE нужен тариф PRIVATE; этот тариф применяется только к PRIVATE.';
        check(fields.tariff, tariffError);
        let zoneError = '';
        if (!data.zone) zoneError = 'Выберите игровую зону или свободный ПК на карте.';
        check(zoneFieldset, zoneError, zoneRadios[0]);
        const requestedInterval = interval(data.date, data.time, data.duration);
        const busy = occupiedSeats(requestedInterval);
        let seatError = '';
        if (data.seats.length !== data.players) seatError = `Выберите по одному ПК на игрока: сейчас выбрано ${data.seats.length}.`;
        for (const id of data.seats) {
            const seat = app.findProduct(seats, id);
            if (!seat || seat.zone !== data.zone) seatError = 'Все выбранные ПК должны находиться в одной выбранной зоне.';
            if (!seatError && !sameRequest(data) && requestedInterval && busy.includes(id)) {
                seatError = 'Выбранный ПК занят в пересекающееся время на демо-схеме. Снимите выбор и выберите свободные места или другой интервал.';
            }
        }
        check(map, seatError);
        let commentError = '';
        if (data.comment.length > 1000) commentError = 'Сократите комментарий до 1 000 символов.';
        check(fields.comment, commentError);
        let agreementError = '';
        if (!fields.agreement.checked) agreementError = 'Подтвердите правильность данных.';
        check(fields.agreement, agreementError);
        let message = '';
        if (invalid.length > 0) {
            message = `Проверьте поля: ${invalid.length}. Подсказки находятся рядом с каждым полем.`;
            if (lastAccepted) message += ' Предыдущий принятый демо-запрос сохранён.';
        }
        notify(errors, message, 'error');
        if (focusFirst && invalid.length > 0) invalid[0].focus();
        return invalid.length === 0;
    }

    // 5. Показываем сохранённые заявки и обрабатываем их отмену.
    function renderReservation(item) {
        const row = el('li', 'list-group-item bg-dark text-light border-secondary');
        const body = el('div', 'd-flex flex-wrap align-items-start justify-content-between gap-2');
        const details = el('div', 'text-break');
        details.append(el('strong', 'd-block', `${zoneNames[item.zone]} · ${item.date}, ${item.time} · ${item.duration} ч.`));
        details.append(el('span', 'd-block small', seatNames(item.seats)));
        details.append(el('span', 'd-block small text-body-secondary text-break', item.id));
        const cancel = el('button', 'btn btn-outline-danger btn-sm text-light', 'Отменить демо-заявку');
        cancel.type = 'button';
        cancel.dataset.cancelBooking = item.id;
        cancel.setAttribute('aria-label', 'Отменить демо-заявку ' + item.id);
        cancel.addEventListener('click', function () { cancelReservation(item.id); });
        body.append(details, cancel);
        row.append(body);
        return row;
    }

    function renderReservations() {
        renderList(localList, reservations, renderReservation, 'Демо-заявок пока нет. После успешной проверки новая заявка появится здесь.');
    }

    function cancelReservation(id) {
        if (storageAvailable) reservations = readReservations();
        if (!app.findProduct(reservations, id)) {
            notify(localStatus, 'Эта демо-заявка уже отменена. Список обновлён.');
            renderReservations();
            refresh();
            localStatus.focus();
            return;
        }
        for (let index = 0; index < reservations.length; index++) {
            if (reservations[index].id === id) {
                reservations.splice(index, 1);
                break;
            }
        }
        const saved = store.set('bookings', reservations);
        storageAvailable = saved;
        let message = `Демо-заявка ${id} отменена, места освобождены на учебной схеме.`;
        if (!saved) message += ' Браузер не разрешил сохранение; изменение действует до перезагрузки.';
        notify(localStatus, message);
        if (lastAccepted && lastAccepted.id === id) {
            lastAccepted = null;
            notify(success, 'Последняя демо-заявка отменена. Можно подготовить новую.');
            list.replaceChildren();
            list.classList.add('hidden');
        }
        renderReservations();
        refresh();
        localStatus.focus();
    }

    // 6. События связывают кнопки и поля с нужными функциями.
    function submitBooking(event) {
        event.preventDefault();
        if (storageAvailable) reservations = readReservations();
        attempted = true;
        if (!validate(true)) {
            updateMap(values());
            return;
        }
        const data = values();
        const fingerprint = JSON.stringify(data);
        if (sameRequest(data)) {
            resultStatus.textContent = 'Этот демо-запрос уже принят в этом браузере. Повторная заявка не создана.';
            return;
        }
        const requestedInterval = interval(data.date, data.time, data.duration);
        const id = reference('BOOK');
        const entry = { id: id, date: data.date, time: data.time, duration: data.duration, seats: data.seats, zone: data.zone, tariff: data.tariff, start: requestedInterval.start, end: requestedInterval.end };
        reservations.push(entry);
        const saved = store.set('bookings', reservations);
        storageAvailable = saved;
        lastAccepted = { id: id, data: entry, fingerprint: fingerprint };
        const price = estimate(data);
        let priceLabel = 'предварительная оценка';
        if (data.tariff === 'private') priceLabel = 'опубликованный минимум';
        let headphones = 'не запрошены';
        if (data.headphones) headphones = 'нужны';
        const confirmation = [
            `Игрок: ${data.name}`, `Контакты: ${data.email}; ${data.phone}`,
            `Зона: ${zoneNames[data.zone]}; ПК: ${data.seats.join(', ')}; игроков: ${data.players}`,
            `Визит: ${data.date}, ${data.time} по Астане; желаемая длительность: ${data.duration} ч.`,
            `Тариф: ${app.findProduct(tariffs, data.tariff).name}; ${priceLabel}: от ${money(price.amount)}`,
            `Наушники: ${headphones}`
        ];
        if (data.comment) confirmation.push(`Комментарий: ${data.comment}`);
        if (data.tariff === 'night' || data.tariff === 'private') confirmation.push('Условия пакета и окончательную стоимость необходимо уточнить у клуба.');
        renderList(list, confirmation, renderConfirmation);
        list.classList.remove('hidden');
        let savedWhere = 'в этом браузере';
        if (!saved) savedWhere = 'до перезагрузки страницы: сохранение браузером недоступно';
        notify(success, `Демо-заявка ${id} сохранена ${savedWhere}. Контакты не сохраняются и не отправляются. Реальное бронирование и оплата не создаются.`, 'success');
        resultStatus.textContent = 'Проверка пройдена. Принятый запрос показан ниже; текущий выбор можно изменить для следующего запроса.';
        renderReservations();
        updateMap(data);
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderConfirmation(text) {
        return el('li', 'list-group-item text-break bg-dark text-light border-secondary', text);
    }

    function onBookingInput(event) {
        if (event.target.matches('input, textarea')) refresh();
    }

    function onBookingChange(event) {
        if (event.target === fields.tariff && fields.tariff.value === 'three-hours') duration.value = '3';
        if (event.target.matches('[name="gaming-zone"]')) {
            const removed = selectedSeats.length;
            selectedSeats = [];
            if (event.target.value === 'duo') fields.players.value = '2';
            let message = 'Выбрана зона ' + zoneNames[event.target.value] + '.';
            if (removed) message += ' Предыдущий выбор ПК очищен.';
            notify(mapFeedback, message + ' Выберите компьютеры на карте.');
        }
        refresh();
    }

    function resetBooking(event) {
        event.preventDefault();
        for (const field of form.querySelectorAll('input')) {
            if (field.type === 'radio' || field.type === 'checkbox') field.checked = false;
            else if (field === fields.players || field === duration) field.value = '1';
            else field.value = '';
        }
        fields.tariff.value = '';
        fields.comment.value = '';
        selectedSeats = [];
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
    }

    function syncBookings(event) {
        if (event.key !== 'topgame-bookings' && event.key !== null) return;
        reservations = readReservations();
        if (lastAccepted && !acceptedRequestExists()) {
            lastAccepted = null;
            notify(success, 'Предыдущая демо-заявка удалена в другой вкладке.');
            list.replaceChildren();
            list.classList.add('hidden');
        }
        notify(localStatus, 'Список демо-заявок и занятость обновлены после изменения в другой вкладке.');
        renderReservations();
        refresh();
    }

    form.addEventListener('submit', submitBooking);
    form.addEventListener('input', onBookingInput);
    form.addEventListener('change', onBookingChange);
    form.addEventListener('reset', resetBooking);
    window.addEventListener('storage', syncBookings);

    // Переход с тарифов или игр может заранее заполнить часть формы.
    const params = new URLSearchParams(window.location.search);
    if (app.findProduct(tariffs, params.get('tariff'))) fields.tariff.value = params.get('tariff');
    let initialZone = params.get('zone');
    if (!initialZone && fields.tariff.value === 'private') initialZone = 'private';
    if (initialZone === 'main' || initialZone === 'duo' || initialZone === 'private') chooseZone(initialZone);
    const initialPlayers = Number(params.get('players'));
    if (Number.isInteger(initialPlayers) && initialPlayers >= 1 && initialPlayers <= seats.length) fields.players.value = String(initialPlayers);
    const initialDuration = Number(params.get('hours'));
    if (Number.isInteger(initialDuration) && initialDuration >= 1 && initialDuration <= 12) duration.value = String(initialDuration);
    if (fields.tariff.value === 'three-hours') duration.value = '3';
    const initialDate = params.get('date') || '';
    if (validDate(initialDate) && initialDate >= today()) fields.date.value = initialDate;
    if (params.get('game')) fields.comment.value = `Предпочтительная игра: ${params.get('game').slice(0, 150)}`;
    reservations = readReservations();
    renderReservations();
    refresh();
}

setupBooking();
