// Comparison archive only. Do not link this file to a page.
// Features: renderList; booking validation; Rules help show/hide.

// ===== ORIGINAL main.js (before jQuery) =====
'use strict';

(() => {
    // Тёмная тема: используем готовые классы Bootstrap, CSS задания не меняем.
    document.documentElement.dataset.bsTheme = 'dark';
    const darkClasses = { 'bg-white': 'bg-body-secondary', 'bg-light': 'bg-body-tertiary', 'text-dark': 'text-light', 'text-danger': 'text-danger-emphasis', 'btn-outline-dark': 'btn-outline-light', 'btn-outline-secondary': 'btn-outline-light', 'border-dark': 'border-secondary', 'alert-light': 'alert-dark', 'table-light': 'table-dark' };
    function darkTheme(element) {
        for (const lightClass in darkClasses) {
            if (element.classList.contains(lightClass)) {
                element.classList.replace(lightClass, darkClasses[lightClass]);
            }
        }
        if (element.matches('.card, .form-control, .form-select, .list-group-item')) element.classList.add('bg-dark', 'text-light');
        if (element.matches('.table')) element.classList.add('table-dark');
        if (element.matches('.list-group-item')) element.classList.add('border-secondary');
        if (element.matches('a:not(.btn):not(.nav-link):not(.navbar-brand)')) element.classList.add('link-light');
        if (element.matches('.btn-outline-danger')) element.classList.add('text-light');
    }
    document.body.classList.add('bg-dark', 'text-light');
    document.querySelectorAll('*').forEach(darkTheme);

    // Создаёт один элемент, задаёт классы и безопасный текст.
    function el(tag, classes = '', text = '') {
        const element = document.createElement(tag);
        for (const name of classes.split(' ')) {
            if (name) element.classList.add(name);
        }
        if (text !== '') element.textContent = text;
        darkTheme(element);
        return element;
    }

    function money(amount) {
        return `${new Intl.NumberFormat('ru-KZ').format(amount)} ₸`;
    }

    function reference(prefix) {
        return window.TopGameLogic.reference(prefix);
    }

    function today() {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    }

    function localDateTime(date, time) {
        return new Date(`${date}T${time}:00+05:00`).getTime();
    }

    const store = {
        get(key, fallback) {
            try {
                const value = localStorage.getItem(`topgame-${key}`);
                return value === null ? fallback : JSON.parse(value);
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(`topgame-${key}`, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        }
    };

    function renderList(container, items, renderItem, emptyText = 'Пока ничего нет.') {
        container.replaceChildren();
        if (items.length === 0) {
            container.append(el(container.tagName === 'UL' ? 'li' : 'p', 'p-3 mb-0 text-body-secondary', emptyText));
        } else {
            items.forEach((item, index) => container.append(renderItem(item, index)));
        }
        return items.length;
    }

    function setError(field, message) {
        const errorId = `${field.id}-error`;
        let error = document.getElementById(errorId);
        if (!error) {
            error = el('span', 'd-block small mt-1 mb-0 hidden');
            error.id = errorId;
            field.insertAdjacentElement('afterend', error);
            const descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
            if (!descriptions.includes(errorId)) descriptions.push(errorId);
            field.setAttribute('aria-describedby', descriptions.join(' '));
        }
        error.textContent = message;
        error.classList.toggle('hidden', !message);
        error.classList.toggle('error', Boolean(message));
        field.classList.toggle('error', Boolean(message));
        field.classList.toggle('is-invalid', Boolean(message));
        field.setAttribute('aria-invalid', String(Boolean(message)));
        return Boolean(message);
    }

    function clearErrors(form) {
        form.querySelectorAll('[aria-invalid="true"]').forEach(field => setError(field, ''));
    }

    function validateContacts(name, email, phone) {
        const digits = phone.trim().replace(/[\s()\-]/g, '');
        return {
            name: name.trim().length >= 2 && name.trim().length <= 80 ? '' : 'Введите имя от 2 до 80 символов.',
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.trim().length <= 254 ? '' : 'Введите почту в формате name@example.com.',
            phone: /^\+7\d{10}$/.test(digits) ? '' : 'Введите телефон: +7 и 10 цифр, например +7 706 400 50 40.'
        };
    }

    function notify(element, text, state = '') {
        element.textContent = text;
        element.classList.toggle('success', state === 'success');
        element.classList.toggle('error', state === 'error');
        element.classList.toggle('hidden', text === '');
        return text;
    }

    window.TopGame = { ...window.TopGameData, ...window.TopGameLogic, el, money, reference, today, localDateTime, store, renderList, setError, clearErrors, validateContacts, notify };

    // The user revised the club capacity after midterm. Update through DOM only.
    const main = document.querySelector('main');
    if (main) {
        const texts = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
        let node = texts.nextNode();
        while (node) {
            node.textContent = node.textContent.replace(/45(?=\s+(?:игров|компьютер|ПК))/g, String(window.TopGame.seats.length));
            node = texts.nextNode();
        }
        main.querySelectorAll('input[max="45"]').forEach(field => { field.max = String(window.TopGame.seats.length); });
        const capacityBadge = main.querySelector('strong abbr[title="персональных компьютеров"]');
        if (capacityBadge) capacityBadge.parentElement.firstChild.textContent = `${window.TopGame.seats.length} `;
    }

    const toggle = document.getElementById('main-navigation-toggle');
    if (toggle) {
        const menu = document.getElementById('main-navigation');
        const syncMenu = () => {
            toggle.setAttribute('aria-expanded', String(toggle.checked));
            // CSS already handles visibility; this adds keyboard Escape behavior.
        };
        toggle.addEventListener('change', syncMenu);
        menu.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                toggle.checked = false;
                syncMenu();
                toggle.focus();
            }
        });
        syncMenu();
    }

    const nav = document.querySelector('#main-navigation .navbar-nav');
    if (nav) {
        const foodLink = el('a', 'nav-link px-2', 'Еда');
        foodLink.href = 'booking.html#food-menu';
        foodLink.id = 'nav-food';
        const item = el('li', 'nav-item');
        item.append(foodLink);
        nav.append(item);
    }

    const home = document.getElementById('index-content');
    if (home) {
        const section = el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
        section.append(el('p', 'small text-uppercase text-danger fw-semibold mb-2', 'Твой следующий сеанс'), el('h2', 'h2 fw-bold mb-3', 'Место для команды и перекус к игре'), el('p', 'mb-3', 'Выберите ПК на схеме зала, подготовьте демо-заявку и соберите заказ еды. Итог и стоимость видны сразу.'));
        const actions = el('div', 'd-flex flex-wrap gap-2');
        const booking = el('a', 'btn btn-danger', 'Выбрать место');
        booking.href = 'booking.html#seat-map';
        const food = el('a', 'btn btn-outline-danger', 'Посмотреть меню');
        food.href = 'booking.html#food-menu';
        actions.append(booking, food);
        section.append(actions);
        home.insertBefore(section, home.children[1] || null);
    }
})();


// ===== ORIGINAL booking.js (before jQuery) =====
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
    formStatus.textContent = 'Укажите время по Астане, выберите любые свободные ПК и заполните контакты. Это локальная демонстрация: данные не отправляются в клуб, реальные бронирование и оплата не создаются. Для подтверждения в клубе: +7 706 400 50 40.';
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
        notify(success, `Локальная заявка ${displayId(id)} сохранена ${saved ? 'в этом браузере' : 'до перезагрузки страницы: сохранение браузером недоступно'}. Данные не отправлены в клуб; реальное бронирование и оплата не созданы.`, 'success');
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


// ===== ORIGINAL rules.js (before jQuery) =====
'use strict';

(() => {
    const app = window.TopGame;
    const helpSection = document.getElementById('rule-table');
    const safetySection = document.getElementById('account-safety');
    if (!app || !helpSection || !safetySection) return;
    // Готовый класс Bootstrap сохраняет читаемость исходной таблицы в тёмной теме.
    helpSection.querySelector('table').classList.add('table-dark');

    // Инструкции основаны на правилах этой страницы; помощь не отправляет заявки.
    const situations = [
        { id: 'device', title: 'Не работает устройство', category: 'equipment', keywords: 'мышь клавиатура гарнитура компьютер техника', steps: ['Позовите администратора и объясните, какое устройство не работает.', 'Не разбирайте и не переносите оборудование самостоятельно.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'damage', title: 'Обнаружено повреждение до начала игры', category: 'equipment', keywords: 'сломано повреждение техника начало', steps: ['Сообщите администратору о повреждении до начала сеанса.', 'Не пытайтесь самостоятельно ремонтировать устройство.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'extend', title: 'Нужно продлить время', category: 'visit', keywords: 'сеанс время продление тариф', steps: ['До окончания сеанса уточните у администратора доступность вашего места.', 'Согласуйте стоимость и возможность продления; калькулятор показывает только ориентир.'], link: 'prices.html', action: 'Посмотреть тарифы' },
        { id: 'lost', title: 'Найдена чужая вещь', category: 'visit', keywords: 'забыто потеряно вещи находка', steps: ['Передайте найденную вещь администратору.', 'Не забирайте чужие вещи с собой.'], link: 'about.html#contacts', action: 'Открыть контакты клуба' },
        { id: 'account', title: 'Нужно безопасно выйти из аккаунтов', category: 'account', keywords: 'пароль браузер выход безопасность логин', steps: ['Выйдите из игровых клиентов и аккаунтов в браузере.', 'Не сохраняйте пароль на общем компьютере и выполните проверку перед уходом.'], link: '#departure-checklist', action: 'Открыть проверку перед уходом' },
        { id: 'install', title: 'Нужна другая игра или программа', category: 'equipment', keywords: 'установка скачать игра программа версия', steps: ['Не устанавливайте программы самостоятельно.', 'Уточните возможность установки у администратора. На странице игр можно подготовить демонстрационный запрос.'], link: 'games.html#game-request', action: 'Открыть запрос игры' }
    ];
    const categories = { equipment: 'Оборудование', visit: 'Посещение', account: 'Аккаунты' };
    const departureItems = [
        { id: 'clients', text: 'Я вышел из игровых клиентов.' },
        { id: 'browser', text: 'Я вышел из аккаунтов в браузере и не сохранил пароли.' },
        { id: 'belongings', text: 'Я забрал свои личные вещи.' },
        { id: 'workstation', text: 'Я проверил чистоту места и сообщил о проблемах администратору.' }
    ];

    function filterSituations(items, query, category) {
        const text = query.trim().toLocaleLowerCase('ru');
        return items.filter(item => (category === 'all' || item.category === category)
            && `${item.title} ${item.keywords} ${item.steps.join(' ')}`.toLocaleLowerCase('ru').includes(text));
    }

    function findSituation(items, id) {
        return items.find(item => item.id === id);
    }

    function getCompletedItems(items, selectedIds) {
        return items.filter(item => selectedIds.includes(item.id));
    }

    function checklistSummary(items, selectedIds) {
        const completed = getCompletedItems(items, selectedIds);
        return {
            completed: completed.length,
            total: items.length,
            remaining: items.filter(item => !selectedIds.includes(item.id)),
            ready: items.length > 0 && completed.length === items.length
        };
    }

    function makeButton(text, id, classes = 'btn btn-outline-danger') {
        const button = app.el('button', classes, text);
        button.type = 'button';
        button.id = id;
        return button;
    }

    function addControl(container, id, labelText, tag) {
        const wrapper = app.el('div', 'col-12 col-md-6');
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = app.el(tag, tag === 'select' ? 'form-select' : 'form-control');
        field.id = id;
        wrapper.append(label, field);
        container.append(wrapper);
        return field;
    }

    // Существующая таблица остаётся; поисковые элементы создаются через DOM.
    const finder = app.el('div', 'mt-4');
    finder.append(app.el('h3', 'h4 fw-bold mb-3', 'Найти помощь по ситуации'));
    const controls = app.el('form', 'row g-3 mb-3');
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Поиск помощи по правилам клуба');
    const search = addControl(controls, 'rules-search', 'Опишите ситуацию', 'input');
    search.type = 'search';
    const category = addControl(controls, 'rules-category', 'Категория', 'select');
    for (const [value, text] of [['all', 'Все категории'], ...Object.entries(categories)]) {
        const option = app.el('option', '', text);
        option.value = value;
        category.append(option);
    }
    const actions = app.el('div', 'col-12 d-flex flex-wrap gap-3 align-items-center');
    const reset = makeButton('Сбросить поиск', 'rules-filter-reset', 'btn btn-outline-secondary');
    const count = app.el('p', 'mb-0');
    count.id = 'rules-result-count';
    count.setAttribute('role', 'status');
    actions.append(reset, count);
    controls.append(actions);
    const list = app.el('div', 'row g-3');
    list.id = 'rules-help-list';
    const detail = app.el('section', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mt-4');
    detail.id = 'rules-help-detail';
    detail.setAttribute('aria-label', 'Инструкции для выбранной ситуации');
    finder.append(controls, list, detail);
    helpSection.append(finder);
    let selectedSituation = '';

    function renderSituation(item) {
        const column = app.el('div', 'col-12 col-md-6');
        const card = app.el('article', 'card h-100');
        card.classList.toggle('selected', item.id === selectedSituation);
        const body = app.el('div', 'card-body d-flex flex-column');
        body.append(app.el('p', 'small text-body-secondary mb-2', categories[item.category]), app.el('h4', 'h5 fw-bold mb-3', item.title));
        const choose = makeButton('Показать действия', `rules-choose-${item.id}`, 'btn btn-outline-danger mt-auto');
        choose.setAttribute('aria-controls', detail.id);
        choose.setAttribute('aria-pressed', String(item.id === selectedSituation));
        choose.addEventListener('click', () => {
            selectedSituation = item.id;
            renderHelp();
            detail.querySelector('h3').focus();
        });
        body.append(choose);
        card.append(body);
        column.append(card);
        return column;
    }

    function renderHelpDetail(item) {
        detail.replaceChildren();
        if (!item) {
            detail.append(app.el('p', 'mb-0', 'Выберите ситуацию, чтобы увидеть инструкции и следующий шаг.'));
            return;
        }
        const heading = app.el('h3', 'h4 fw-bold mb-3', item.title);
        heading.tabIndex = -1;
        const steps = app.el('ol', 'ps-3 mb-3');
        app.renderList(steps, item.steps, text => app.el('li', 'mb-2', text), 'Уточните действия у администратора.');
        const next = app.el('a', 'btn btn-danger', item.action);
        next.href = item.link;
        const close = makeButton('Закрыть инструкции', 'rules-detail-close', 'btn btn-outline-secondary');
        close.addEventListener('click', () => {
            const previousId = selectedSituation;
            selectedSituation = '';
            renderHelp();
            document.getElementById(`rules-choose-${previousId}`)?.focus();
        });
        const links = app.el('div', 'd-flex flex-wrap gap-2');
        links.append(next, close);
        detail.append(heading, steps, links, app.el('p', 'small text-body-secondary mt-3 mb-0', 'Инструкции не отправляют сообщение администратору. Для помощи обратитесь к персоналу клуба.'));
    }

    function renderHelp() {
        const matches = filterSituations(situations, search.value, category.value);
        if (!matches.some(item => item.id === selectedSituation)) selectedSituation = '';
        app.renderList(list, matches, renderSituation, 'Подходящих ситуаций нет. Измените запрос или сбросьте поиск.');
        count.textContent = `Найдено ситуаций: ${matches.length} из ${situations.length}`;
        renderHelpDetail(findSituation(matches, selectedSituation));
    }

    controls.addEventListener('input', renderHelp);
    controls.addEventListener('change', renderHelp);
    controls.addEventListener('submit', event => { event.preventDefault(); renderHelp(); });
    reset.addEventListener('click', () => {
        controls.reset();
        selectedSituation = '';
        renderHelp();
        search.focus();
    });

    const checklist = app.el('section', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mt-4');
    checklist.id = 'departure-checklist';
    checklist.setAttribute('aria-labelledby', 'departure-title');
    const title = app.el('h3', 'h4 fw-bold mb-3', 'Проверка перед уходом');
    title.id = 'departure-title';
    checklist.append(title, app.el('p', 'mb-3', 'Отметьте выполненные действия. Это ваша самостоятельная проверка: сайт не проверяет аккаунты и не завершает сеанс на ПК.'));
    const checklistList = app.el('ul', 'list-group mb-3');
    checklistList.id = 'departure-list';

    function renderDepartureItem(item) {
        const row = app.el('li', 'list-group-item bg-dark text-light');
        const input = app.el('input', 'form-check-input me-2');
        input.type = 'checkbox';
        input.id = `departure-${item.id}`;
        input.value = item.id;
        const label = app.el('label', 'form-check-label', item.text);
        label.htmlFor = input.id;
        row.append(input, label);
        return row;
    }

    app.renderList(checklistList, departureItems, renderDepartureItem, 'Нет пунктов для проверки.');
    const progress = app.el('p', 'fw-semibold mb-3');
    progress.id = 'departure-progress';
    progress.setAttribute('role', 'status');
    const remainingLabel = app.el('p', 'mb-2', 'Осталось выполнить:');
    const remainingList = app.el('ul', 'ps-3 mb-3');
    remainingList.id = 'departure-remaining';
    const complete = makeButton('Завершить проверку', 'departure-complete', 'btn btn-danger');
    const clear = makeButton('Начать заново', 'departure-reset', 'btn btn-outline-secondary');
    const checklistActions = app.el('div', 'd-flex flex-wrap gap-2');
    checklistActions.append(complete, clear);
    const message = app.el('p', 'p-3 mt-3 mb-0 hidden');
    message.id = 'departure-confirmation';
    message.setAttribute('role', 'status');
    checklist.append(checklistList, progress, remainingLabel, remainingList, checklistActions, message);
    safetySection.querySelector('aside').before(checklist);

    function currentChecklistSummary() {
        const selectedIds = Array.from(checklistList.querySelectorAll('input:checked'), input => input.value);
        return checklistSummary(departureItems, selectedIds);
    }

    function updateChecklist() {
        const summary = currentChecklistSummary();
        progress.textContent = `Выполнено: ${summary.completed} из ${summary.total}. ${summary.ready ? 'Можно завершить проверку.' : 'Отметьте оставшиеся действия.'}`;
        progress.classList.toggle('success', summary.ready);
        complete.disabled = !summary.ready;
        checklistList.querySelectorAll('li').forEach(row => row.classList.toggle('selected', row.querySelector('input').checked));
        app.renderList(remainingList, summary.remaining, item => app.el('li', 'mb-2', item.text), 'Все пункты отмечены.');
        remainingLabel.classList.toggle('hidden', summary.ready);
        app.notify(message, '');
        return summary;
    }

    checklistList.addEventListener('change', updateChecklist);
    complete.addEventListener('click', () => {
        const summary = currentChecklistSummary();
        if (!summary.ready) return;
        app.notify(message, `Самопроверка завершена: ${summary.completed} из ${summary.total} действий отмечены. Спасибо за заботу о безопасности и порядке.`, 'success');
    });
    clear.addEventListener('click', () => {
        checklistList.querySelectorAll('input').forEach(input => { input.checked = false; });
        updateChecklist();
        app.notify(message, 'Проверка сброшена. Можно начать заново.');
        checklistList.querySelector('input').focus();
    });

    renderHelp();
    updateChecklist();
})();
