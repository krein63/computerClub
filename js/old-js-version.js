// Reference only: original Assignment 5 implementations. Not loaded by any page.
'use strict';

function setupComputers() {
    const app = window.TopGame;
    const section = document.getElementById('computers-section-2');
    if (!app || !section) return;

    // 1. Получаем фильтры, карточки зон и область сравнения.
    const controls = document.getElementById('equipment-filters');
    const grid = section.querySelector('.row.g-4');
    const search = document.getElementById('equipment-search');
    const refresh = document.getElementById('equipment-refresh');
    const privacy = document.getElementById('equipment-private');
    const count = document.getElementById('equipment-result-count');
    const comparisonStatus = document.getElementById('equipment-comparison-status');
    const comparisonResult = document.getElementById('equipment-compare-result');
    const clear = document.getElementById('equipment-compare-clear');
    const template = document.getElementById('equipment-card-template');
    const equipment = [
        { id: 'main', name: 'Main', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 310, privacy: false, description: 'Общий зал для одиночной игры и матчей с друзьями.', article: 'computers-article-1' },
        { id: 'duo', name: 'Duo’s', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 380, privacy: false, description: 'Места рядом для двух игроков.', article: 'computers-article-2' },
        { id: 'private', name: 'Private', processor: 'Ryzen 7800X3D', graphics: 'RTX 4070 Super', memory: 32, refresh: 380, privacy: true, description: 'Отдельное игровое пространство.', article: 'computers-article-3' }
    ];

    function bookingLink(zone) {
        const params = new URLSearchParams();
        params.set('zone', zone.id);
        if (zone.id === 'duo') params.set('players', '2');
        if (zone.id === 'private') params.set('tariff', 'private');
        return `booking.html?${params.toString()}#gaming-zone-selection`;
    }

    for (const zone of equipment) {
        const article = document.getElementById(zone.article);
        zone.node = article.parentElement;
        zone.checkbox = document.getElementById('compare-' + zone.id);
        zone.capacity = 0;
        for (const seat of app.seats) {
            if (seat.zone === zone.id) zone.capacity += 1;
        }
        article.querySelector('a').href = bookingLink(zone);
        article.querySelector('[data-zone-capacity]').textContent = `Мест на демонстрационной схеме: ${zone.capacity}.`;
        zone.checkbox.addEventListener('change', renderComparison);
    }

    // 2. Собираем зоны, подходящие под все выбранные фильтры.
    function getEquipmentNode(zone) {
        return zone.node;
    }

    function renderEquipment() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = [];
        for (const zone of equipment) {
            const description = `${zone.name} ${zone.processor} ${zone.graphics}`.toLocaleLowerCase('ru');
            if (!description.includes(query)) continue;
            if (zone.refresh < Number(refresh.value)) continue;
            if (privacy.value === 'private' && !zone.privacy) continue;
            if (privacy.value === 'shared' && zone.privacy) continue;
            matches.push(zone);
        }
        app.renderList(grid, matches, getEquipmentNode, 'Подходящих зон нет. Измените характеристики или сбросьте фильтры.');
        count.textContent = `Найдено зон: ${matches.length} из ${equipment.length}`;
    }

    // 3. Заполняем копию HTML-шаблона для каждой отмеченной зоны.
    function renderComparisonCard(zone) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.querySelector('h3').textContent = zone.name;
        card.querySelector('[data-processor]').textContent = zone.processor;
        card.querySelector('[data-graphics]').textContent = zone.graphics;
        card.querySelector('[data-memory]').textContent = zone.memory + ' GB';
        card.querySelector('[data-refresh]').textContent = 'ASUS ' + zone.refresh + ' Hz';
        card.querySelector('[data-description]').textContent = zone.description;
        card.querySelector('[data-capacity]').textContent = zone.capacity;
        card.querySelector('a').href = bookingLink(zone);
        const remove = card.querySelector('button');
        remove.dataset.removeZone = zone.id;
        remove.addEventListener('click', removeFromComparison);
        return card;
    }

    function renderComparison() {
        const choices = [];
        for (const zone of equipment) {
            const checked = zone.checkbox.checked;
            // Ссылка на карточку работает и после её скрытия фильтром.
            zone.node.querySelector('article').classList.toggle('selected', checked);
            if (checked) choices.push(zone);
        }
        app.renderList(comparisonResult, choices, renderComparisonCard, 'Сравнение пусто. Отметьте зоны в карточках выше.');
        comparisonStatus.textContent = `Выбрано зон: ${choices.length}.`;
        if (choices.length > 0) {
            comparisonStatus.textContent += ' Характеристики взяты из исходного описания клуба; наличие мест проверьте при бронировании.';
        }
        clear.disabled = choices.length === 0;
    }

    function removeFromComparison(event) {
        for (const zone of equipment) {
            if (zone.id === event.currentTarget.dataset.removeZone) zone.checkbox.checked = false;
        }
        renderComparison();
        if (clear.disabled) {
            comparisonStatus.focus();
        } else {
            clear.focus();
        }
    }

    function submitFilters(event) {
        event.preventDefault();
        renderEquipment();
    }

    function resetFilters() {
        controls.reset();
        renderEquipment();
        search.focus();
    }

    function clearComparison() {
        for (const zone of equipment) zone.checkbox.checked = false;
        renderComparison();
        search.focus();
    }

    controls.addEventListener('submit', submitFilters);
    controls.addEventListener('input', renderEquipment);
    document.getElementById('equipment-filter-reset').addEventListener('click', resetFilters);
    clear.addEventListener('click', clearComparison);
    renderEquipment();
    renderComparison();
}

setupComputers();

'use strict';

function setupAbout() {
    const app = window.TopGame;
    const form = document.getElementById('review-form');
    if (!app || !form) return;

    // 1. Находим готовые элементы страницы.
    const name = document.getElementById('review-name');
    const rating = document.getElementById('review-rating');
    const text = document.getElementById('review-text');
    const counter = document.getElementById('review-counter');
    const status = document.getElementById('review-status');
    const sort = document.getElementById('review-sort');
    const filter = document.getElementById('review-rating-filter');
    const list = document.getElementById('review-list');
    const count = document.getElementById('review-result-count');
    const template = document.getElementById('review-card-template');
    let attempted = false;
    let resetAfterSubmit = false;
    const reviews = [];

    // 2. Загружаем только корректные отзывы из браузера.
    function isValidReview(review) {
        if (!review || typeof review.id !== 'string') return false;
        if (typeof review.name !== 'string') return false;
        if (review.name.trim().length < 2 || review.name.length > 80) return false;
        if (typeof review.text !== 'string') return false;
        if (review.text.trim().length < 20 || review.text.length > 1000) return false;
        if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) return false;
        if (typeof review.createdAt !== 'string') return false;
        return Number.isFinite(Date.parse(review.createdAt));
    }

    const stored = app.store.get('demo-reviews', []);
    if (Array.isArray(stored)) {
        for (const review of stored) {
            if (isValidReview(review)) reviews.push(review);
        }
    }

    function validateReview() {
        app.clearErrors(form);
        const invalid = [];
        const nameLength = name.value.trim().length;
        const textLength = text.value.trim().length;
        const score = Number(rating.value);
        if (nameLength < 2 || nameLength > 80) {
            app.setError(name, 'Имя должно содержать от 2 до 80 символов.');
            invalid.push(name);
        }
        if (!Number.isInteger(score) || score < 1 || score > 5) {
            app.setError(rating, 'Выберите оценку от 1 до 5.');
            invalid.push(rating);
        }
        if (textLength < 20 || textLength > 1000) {
            app.setError(text, 'Напишите от 20 до 1000 символов без учёта пробелов по краям.');
            invalid.push(text);
        }
        return invalid;
    }

    function updateCounter() {
        counter.textContent = `${text.value.length} / 1000 · минимум 20 символов`;
    }

    // 3. Копируем HTML-шаблон и заполняем его безопасным текстом.
    function renderReview(review) {
        const card = template.content.firstElementChild.cloneNode(true);
        card.querySelector('article').dataset.review = review.id;
        card.querySelector('[data-review-name]').textContent = review.name;
        card.querySelector('[data-review-rating]').textContent = '★ ' + review.rating + ' / 5';
        card.querySelector('[data-review-text]').textContent = review.text;
        const date = card.querySelector('time');
        date.dateTime = review.createdAt;
        const format = new Intl.DateTimeFormat('ru-RU', {
            timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short'
        });
        date.textContent = format.format(new Date(review.createdAt)) + ' (Астана)';
        const remove = card.querySelector('button');
        remove.dataset.removeReview = review.id;
        remove.addEventListener('click', removeReview);
        return card;
    }

    function compareReviews(first, second) {
        const dateDifference = Date.parse(second.createdAt) - Date.parse(first.createdAt);
        if (sort.value === 'oldest') return -dateDifference;
        if (sort.value === 'rating' && first.rating !== second.rating) {
            return second.rating - first.rating;
        }
        return dateDifference;
    }

    function renderReviews() {
        const matches = [];
        for (const review of reviews) {
            if (filter.value === '0' || review.rating === Number(filter.value)) {
                matches.push(review);
            }
        }
        matches.sort(compareReviews);
        let emptyText = 'С такой оценкой пока нет отзывов. Попробуй другой фильтр.';
        if (reviews.length === 0) {
            emptyText = 'Отзывов пока нет. Можно оставить первый в форме выше.';
        }
        app.renderList(list, matches, renderReview, emptyText);
        count.textContent = `${matches.length} из ${reviews.length} отзывов`;
    }

    function removeReview(event) {
        const id = event.currentTarget.dataset.removeReview;
        for (let index = reviews.length - 1; index >= 0; index -= 1) {
            if (reviews[index].id === id) reviews.splice(index, 1);
        }
        const saved = app.store.set('demo-reviews', reviews);
        renderReviews();
        let message = 'Отзыв удалён с текущей страницы. Браузер не разрешил обновить хранилище; после перезагрузки он может появиться снова.';
        if (saved) message = 'Демонстрационный отзыв удалён из этого браузера.';
        app.notify(status, message, '');
        sort.focus();
    }

    // 4. Проверяем форму и сохраняем новый отзыв.
    function onFormEdit() {
        updateCounter();
        if (attempted) {
            const invalid = validateReview();
            if (invalid.length === 0) {
                app.notify(status, 'Поля исправлены. Можно добавить демонстрационный отзыв.', '');
            }
        } else {
            status.classList.add('hidden');
        }
    }

    function submitReview(event) {
        event.preventDefault();
        attempted = true;
        const invalid = validateReview();
        if (invalid.length > 0) {
            app.notify(status, `Отзыв не добавлен. Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            invalid[0].focus();
            return;
        }
        reviews.push({
            id: app.reference('REVIEW'),
            name: name.value.trim(),
            rating: Number(rating.value),
            text: text.value.trim(),
            createdAt: new Date().toISOString()
        });
        const saved = app.store.set('demo-reviews', reviews);
        resetFilters();
        resetAfterSubmit = true;
        form.reset();
        resetAfterSubmit = false;
        updateCounter();
        let message = 'Демонстрационный отзыв добавлен на текущую страницу. Браузер не разрешил сохранение: после перезагрузки он исчезнет. Данные не отправлены на сервер.';
        if (saved) {
            message = 'Отзыв сохранён в этом браузере. В клуб он не отправлен.';
        }
        app.notify(status, message, 'success');
    }

    function finishReset() {
        updateCounter();
        app.notify(status, 'Форма отзыва очищена.', '');
    }

    function resetForm() {
        app.clearErrors(form);
        attempted = false;
        // Событие reset приходит до очистки полей самим браузером.
        if (!resetAfterSubmit) setTimeout(finishReset, 0);
    }

    function resetFilters() {
        filter.value = '0';
        sort.value = 'newest';
        renderReviews();
    }

    form.addEventListener('input', onFormEdit);
    form.addEventListener('change', onFormEdit);
    form.addEventListener('submit', submitReview);
    form.addEventListener('reset', resetForm);
    sort.addEventListener('change', renderReviews);
    filter.addEventListener('change', renderReviews);
    document.getElementById('review-filter-reset').addEventListener('click', resetFilters);
    updateCounter();
    renderReviews();
}

setupAbout();

'use strict';

function setupBooking() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    const app = window.TopGame;
    const food = window.TopGameFood;
    function byId(id) { return document.getElementById(id); }
    const fields = {
        date: byId('booking-date'), time: byId('booking-time'),
        duration: byId('booking-duration'), tariff: byId('booking-tariff'),
        name: byId('customer-name'), phone: byId('customer-phone'),
        email: byId('customer-email'), comment: byId('booking-comment'),
        agreement: byId('booking-agreement')
    };
    const zoneNames = { main: 'Main', duo: 'Duo', private: 'Private' };
    function validZone(id) { return ['main', 'duo', 'private'].includes(id); }
    const cartContent = byId('cart-content');
    const dialog = byId('cart-dialog');
    let selectedSeats = [];
    let zone = 'main';
    let step = 0;
    let completed = false;
    let storageAvailable = true;
    let syncingDraft = false;
    const orders = { bookings: readOrders('bookings'), orders: readOrders('orders') };

    // 1. Дата и время всегда по Астане, даже если посетитель в другом часовом поясе.
    function formatAstana(date, locale, options) {
        return new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Almaty', ...options }).format(date);
    }
    function dateInAstana(date) {
        return formatAstana(date, 'en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
    function tomorrow() {
        return dateInAstana(new Date(app.localDateTime(app.today(), '12:00') + 86400000));
    }
    function defaultVisit() {
        const nextHour = new Date(Date.now() + 60 * 60 * 1000);
        fields.date.value = dateInAstana(nextHour);
        const hour = formatAstana(nextHour, 'en-GB', { hour: '2-digit', hourCycle: 'h23' });
        fields.time.value = hour + ':00';
        fields.duration.value = '2';
    }
    function validDate(date) {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        const check = new Date(date + 'T12:00:00+05:00');
        return Number.isFinite(check.getTime()) && dateInAstana(check) === date && Number(date.slice(0, 4)) >= 2020;
    }
    function interval(date, time, duration) {
        if (!validDate(date) || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
        if (!app.validQuantity(duration, 12)) return null;
        const start = app.localDateTime(date, time);
        return { start: start, end: start + duration * 60 * 60 * 1000 };
    }
    function currentInterval() {
        return interval(fields.date.value, fields.time.value, Number(fields.duration.value));
    }
    function overlaps(first, second) {
        return first.start < second.end && first.end > second.start;
    }
    function seatNames(ids) {
        return ids.map(id => 'PC ' + String(id).padStart(2, '0')).join(', ');
    }
    function readOrders(key) {
        const saved = app.store.get(key, []);
        if (!Array.isArray(saved)) return [];
        return saved.filter(item => {
            if (!item || typeof item.id !== 'string' || item.id.length > 80) return false;
            if (key === 'orders') {
                return Array.isArray(item.items) && item.items.length > 0 && item.items.every(line =>
                    line && app.findProduct(app.menu, line.id) && app.validQuantity(line.quantity, 20));
            }
            const visit = interval(item.date, item.time, item.duration);
            return validZone(item.zone) && app.findProduct(app.tariffs, item.tariff) &&
                visit && item.start === visit.start && item.end === visit.end &&
                Array.isArray(item.seats) && item.seats.length > 0 && item.seats.every((id, index) => {
                    const seat = app.findProduct(app.seats, id);
                    return seat && seat.zone === item.zone && item.seats.indexOf(id) === index;
                });
        });
    }
    function syncOrders() {
        for (const key of ['bookings', 'orders']) orders[key] = readOrders(key);
    }
    function busySeats() {
        const requested = currentInterval();
        const busy = [];
        if (!requested) return busy;
        // Учебный вечерний сеанс проверяется так же, как сохранённые заявки.
        const sessions = [{ ...interval(app.today(), '18:00', 3), seats: [3, 4, 8, 12, 17] }, ...orders.bookings];
        for (const session of sessions) {
            if (!overlaps(requested, session)) continue;
            for (const id of session.seats) if (!busy.includes(id)) busy.push(id);
        }
        return busy;
    }

    // 2. Число выбранных ПК — это количество игроков.
    function showMessage(id, message) {
        const element = byId(id);
        element.textContent = message;
        element.hidden = !message;
    }
    function setZone(nextZone, explain) {
        if (!validZone(nextZone)) return;
        if (zone !== nextZone && selectedSeats.length > 0) {
            selectedSeats = [];
            if (explain) showMessage('booking-feedback', 'Выбрана зона ' + zoneNames[nextZone] + '. Предыдущие места сняты — выбери новые на схеме.');
        }
        zone = nextZone;
        if (zone === 'private') fields.tariff.value = 'private';
        else if (fields.tariff.value === 'private') fields.tariff.value = 'hour';
    }
    function setTariff(id) {
        if (!app.findProduct(app.tariffs, id)) return;
        fields.tariff.value = id;
        if (id === 'private') setZone('private', true);
        else if (zone === 'private') setZone('main', true);
        if (id === 'three-hours') fields.duration.value = '3';
        changed();
    }
    function toggleSeat(id) {
        if (busySeats().includes(id)) return;
        const seat = app.findProduct(app.seats, id);
        if (!seat) return;
        if (seat.zone !== zone) setZone(seat.zone, true);
        const index = selectedSeats.indexOf(id);
        if (index >= 0) selectedSeats.splice(index, 1);
        else {
            if (zone === 'duo' && selectedSeats.length === 2) {
                showMessage('booking-feedback', 'Для Duo выбери два места. Сними одно из выбранных, чтобы заменить его.');
                return;
            }
            selectedSeats.push(id);
        }
        selectedSeats.sort((first, second) => first - second);
        showMessage('booking-step-error', '');
        changed();
    }
    function removeSeat(id) {
        const index = selectedSeats.indexOf(id);
        if (index < 0) return;
        selectedSeats.splice(index, 1);
        changed();
        const next = document.querySelector('[data-remove-seat]');
        if (next) next.focus();
        else byId('cart-title').focus();
    }
    function updateMap() {
        const busy = busySeats();
        let free = 0;
        for (const seat of app.seats) {
            const button = byId('seat-' + seat.id);
            const occupied = busy.includes(seat.id);
            const selected = selectedSeats.includes(seat.id);
            let state = 'available';
            let label = 'Свободно';
            if (selected) { state = 'selected'; label = 'Выбрано'; }
            if (occupied) { state = 'occupied'; label = 'Занято'; }
            button.disabled = occupied;
            button.dataset.seatState = state;
            button.classList.toggle('is-conflict', occupied && selected);
            button.setAttribute('aria-pressed', String(selected));
            button.setAttribute('aria-label', 'PC ' + seat.id + ', ' + zoneNames[seat.zone] + ', ' + label);
            button.querySelector('.station-status').textContent = label;
            if (seat.zone === zone && !occupied) free++;
        }
        for (const map of document.querySelectorAll('[data-zone-map]')) map.hidden = map.dataset.zoneMap !== zone;
        for (const button of document.querySelectorAll('[data-zone-pick]')) button.setAttribute('aria-pressed', String(button.dataset.zonePick === zone));
        for (const button of document.querySelectorAll('[data-tariff-pick]')) button.setAttribute('aria-pressed', String(button.dataset.tariffPick === fields.tariff.value));
        byId('seat-map-status').textContent = zoneNames[zone] + ' · свободно ' + free + ' ПК';
        byId('player-count').textContent = selectedSeats.length;
        byId('clear-seat-selection').disabled = selectedSeats.length === 0;
        byId('seat-zone-note').textContent = 'Нажми на свободный ПК, чтобы добавить его в заказ. Можно выбрать несколько.';
        if (zone === 'duo') byId('seat-zone-note').textContent = 'Duo — для игры вдвоём. Выбери два свободных ПК.';
        fields.duration.disabled = fields.tariff.value === 'three-hours';
        byId('duration-decrease').disabled = fields.duration.disabled || Number(fields.duration.value) <= 1;
        byId('duration-increase').disabled = fields.duration.disabled || Number(fields.duration.value) >= 12;
        let note = 'Цена за каждый выбранный ПК. Количество игроков определим по местам.';
        if (fields.tariff.value === 'three-hours') note = 'Пакет включает ровно 3 часа на каждом выбранном ПК.';
        if (fields.tariff.value === 'night') note = 'Укажи желаемый интервал. Точное время ночного пакета нужно подтвердить у администратора.';
        if (fields.tariff.value === 'private') note = 'Укажи желаемый интервал. Цена Private — от 2 500 ₸; стоимость группы и период оплаты уточняются в клубе.';
        byId('booking-duration-note').textContent = note;
        const visit = currentInterval();
        byId('visit-end-time').textContent = '';
        if (visit) {
            const end = new Date(visit.end);
            const time = formatAstana(end, 'en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
            let suffix = '';
            if (dateInAstana(end) !== fields.date.value) suffix = ' · следующий день';
            byId('visit-end-time').textContent = 'До ' + time + suffix;
        }
        fields.date.min = app.today();
        byId('date-today').setAttribute('aria-pressed', String(fields.date.value === app.today()));
        byId('date-tomorrow').setAttribute('aria-pressed', String(fields.date.value === tomorrow()));
    }
    function gamesPrice() {
        if (selectedSeats.length === 0) return 0;
        const tariff = app.findProduct(app.tariffs, fields.tariff.value);
        if (!tariff || !app.validQuantity(Number(fields.duration.value), 12)) return null;
        if (tariff.id === 'private') return null;
        let total = tariff.price * selectedSeats.length;
        if (tariff.id === 'hour') total *= Number(fields.duration.value);
        return total;
    }

    // 3. ПК и еда находятся в одной корзине. Контакты вводятся один раз.
    const element = app.el;
    function cloneTemplate(id) {
        return byId(id).content.firstElementChild.cloneNode(true);
    }
    function renderPcItem(id) {
        const item = cloneTemplate('pc-item-template');
        const tariff = app.findProduct(app.tariffs, fields.tariff.value);
        item.querySelector('strong').textContent = seatNames([id]) + ' · ' + zoneNames[zone];
        item.querySelector('small').textContent = fields.duration.value + ' ч. · ' + tariff.name;
        const total = gamesPrice();
        item.querySelector('.cart-item-price').textContent = total === null ? 'Уточняется' : app.money(total / selectedSeats.length);
        const remove = item.querySelector('button');
        remove.dataset.removeSeat = id;
        remove.setAttribute('aria-label', 'Убрать PC ' + id + ' из заказа');
        return item;
    }
    function renderFoodItem(line) {
        const product = app.findProduct(app.menu, line.id);
        const item = cloneTemplate('food-item-template');
        item.querySelector('img').src = product.image;
        item.querySelector('strong').textContent = product.name;
        item.querySelector('.quantity-value').textContent = line.quantity;
        item.querySelector('.cart-item-price').textContent = app.money(product.price * line.quantity);
        const labels = { decrease: 'Уменьшить количество: ', increase: 'Увеличить количество: ', remove: 'Удалить: ' };
        for (const button of item.querySelectorAll('[data-food-action]')) {
            const action = button.dataset.foodAction;
            button.id = 'cart-' + product.id + '-' + action;
            button.dataset.foodId = product.id;
            button.setAttribute('aria-label', labels[action] + product.name);
            button.disabled = action === 'increase' && line.quantity >= 20;
        }
        return item;
    }
    // Один обработчик обслуживает кнопки корзины и внутри мобильного диалога.
    cartContent.addEventListener('click', event => {
        const button = event.target.closest('[data-remove-seat], [data-food-action]');
        if (!button) return;
        if (button.hasAttribute('data-remove-seat')) { removeSeat(Number(button.dataset.removeSeat)); return; }
        const id = button.dataset.foodId;
        const action = button.dataset.foodAction;
        if (action === 'remove') food.removeItem(id);
        else food.changeQuantity(id, action === 'increase' ? 1 : -1);
        const next = byId(button.id);
        if (next && !next.disabled) next.focus();
        else byId('cart-title').focus();
    });
    function renderCart() {
        const lines = food.getCart();
        let count = selectedSeats.length;
        for (const line of lines) count += line.quantity;
        byId('cart-count').textContent = count;
        byId('mobile-cart-count').textContent = count;
        byId('cart-empty').hidden = count > 0;
        byId('cart-totals').hidden = count === 0;
        byId('cart-pc-section').hidden = selectedSeats.length === 0;
        byId('cart-food-section').hidden = lines.length === 0;
        byId('cart-pc-items').replaceChildren(...selectedSeats.map(renderPcItem));
        byId('cart-food-items').replaceChildren(...lines.map(renderFoodItem));
        let date = fields.date.value;
        if (validDate(date)) date = formatAstana(new Date(date + 'T12:00:00+05:00'), 'ru-RU', { day: 'numeric', month: 'long' });
        byId('cart-visit').textContent = date + ' · ' + fields.time.value + ' · ' + fields.duration.value + ' ч.';
        const pcTotal = gamesPrice();
        const foodTotal = food.getTotal();
        const prefix = selectedSeats.length > 0 ? 'от ' : '';
        const pcText = pcTotal === null ? 'Уточняется' : prefix + app.money(pcTotal);
        const total = pcTotal === null ? 'Уточняется' : prefix + app.money(pcTotal + foodTotal);
        let note = 'Цены «от». Итоговую стоимость подтвердит администратор.';
        if (pcTotal === null) {
            note = fields.tariff.value === 'private'
                ? 'Private — от 2 500 ₸. Стоимость группы и период оплаты уточняются. Еда указана отдельно.'
                : 'Укажи от 1 до 12 полных часов, чтобы рассчитать стоимость.';
        }
        byId('cart-games-total').textContent = pcText;
        byId('cart-food-total').textContent = app.money(foodTotal);
        byId('cart-total').textContent = total;
        byId('mobile-cart-total').textContent = total;
        byId('cart-price-note').textContent = note;
        // В шапке показываем количество всех позиций заказа.
        byId('nav-cart').textContent = 'Корзина · ' + count;
    }
    function updateDelivery() {
        const hasFood = food.getCart().length > 0;
        byId('food-delivery-fields').hidden = !hasFood;
        const select = byId('food-seat');
        const previous = select.value;
        const seats = app.seats.filter(seat => selectedSeats.length === 0 || selectedSeats.includes(seat.id));
        select.replaceChildren(new Option('Выбери ПК', ''), ...seats.map(seat =>
            new Option(seatNames([seat.id]) + ' · ' + zoneNames[seat.zone], seat.id)));
        select.value = previous;
        if (!select.value && selectedSeats.length > 0) select.value = String(selectedSeats[0]);
        const toSeat = byId('food-delivery').value === 'seat';
        byId('food-seat-column').hidden = !toSeat;
        select.disabled = !toSeat;
        byId('delivery-help').textContent = 'Еду принесём к одному из выбранных мест.';
        if (selectedSeats.length === 0) byId('delivery-help').textContent = 'Если уже играешь в клубе, укажи свой ПК. Можно также забрать заказ у стойки.';
        if (!toSeat) byId('delivery-help').textContent = 'Готовый заказ можно будет забрать у стойки.';
    }
    function changed() {
        saveDraft();
        refresh();
    }
    function refresh() {
        updateMap();
        renderCart();
        updateDelivery();
        byId('choose-pc-button').hidden = selectedSeats.length > 0 || step === 0;
        let label = 'Дальше: еда →';
        if (step === 1) label = 'Дальше: контакты →';
        if (step === 2) label = 'Создать демо-заявку ↗';
        if (completed) label = 'Собрать новый заказ ↗';
        byId('cart-continue').textContent = label;
        byId('mobile-next').textContent = 'Дальше →';
        if (step === 2) byId('mobile-next').textContent = 'Оформить ↗';
        if (completed) byId('mobile-next').textContent = 'Новый заказ ↗';
        byId('booking-next').textContent = label;
        if (step === 1 && food.getCart().length === 0 && selectedSeats.length > 0) byId('booking-next').textContent = 'Без еды, к контактам →';
    }

    // 4. Переходы между тремя шагами сохраняют введённые значения.
    function validateVisit() {
        if (!selectedSeats.length) return 'Выбери хотя бы один свободный ПК на схеме.';
        const visit = currentInterval();
        if (!visit) return 'Укажи корректные дату, время и целую длительность от 1 до 12 часов.';
        if (visit.start <= Date.now()) return 'Это время уже прошло. Выбери будущее время по Астане.';
        if (zone === 'duo' && selectedSeats.length !== 2) return 'Для Duo выбери ровно два свободных ПК.';
        if (fields.tariff.value === 'three-hours' && Number(fields.duration.value) !== 3) return 'Пакет «3 часа» включает ровно три часа.';
        const busy = busySeats();
        if (selectedSeats.some(id => busy.includes(id))) return 'Один из выбранных ПК занят на это время. Убери его из корзины или измени время.';
        return '';
    }
    function showStep(next, focusHeading) {
        step = next;
        for (const panel of document.querySelectorAll('[data-step-panel]')) panel.hidden = Number(panel.dataset.stepPanel) !== step;
        for (const button of document.querySelectorAll('[data-step]')) {
            if (Number(button.dataset.step) === step) button.setAttribute('aria-current', 'step');
            else button.removeAttribute('aria-current');
            button.classList.toggle('is-complete', Number(button.dataset.step) < step);
        }
        byId('booking-back').hidden = step === 0;
        byId('booking-next').hidden = step === 2;
        byId('booking-submit').hidden = step !== 2;
        refresh();
        saveDraft();
        if (focusHeading) {
            const panel = document.querySelector('[data-step-panel="' + step + '"]');
            const heading = panel.querySelector('h2');
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
            document.querySelector('.booking-steps').scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    }
    function checkCart(requireSeat = false, requireItems = true) {
        let error = '';
        const hasSeats = selectedSeats.length > 0;
        if (hasSeats || requireSeat) error = validateVisit();
        else if (requireItems && food.getCart().length === 0) error = 'Корзина пока пустая. Добавь еду или выбери ПК.';
        if (!error) return true;
        showStep(hasSeats || requireSeat ? 0 : 1, true);
        showMessage('booking-step-error', error);
        if (requireSeat) (hasSeats ? fields.date : byId('seat-map')).focus();
        return false;
    }
    function goToStep(next, requireSeat = false) {
        if (completed) return;
        showMessage('booking-step-error', '');
        if (next > 0 && !checkCart(requireSeat, next === 2)) return;
        showStep(next, true);
    }
    function continueFlow() {
        dialog.close();
        if (completed) newBooking();
        else if (step === 2) form.requestSubmit();
        else goToStep(step + 1, step === 0);
    }
    function visitData() {
        return {
            date: fields.date.value, time: fields.time.value, duration: Number(fields.duration.value),
            tariff: fields.tariff.value, zone: zone, seats: selectedSeats.slice()
        };
    }
    function saveDraft() {
        if (!completed && !syncingDraft) app.store.set('visit-draft', { ...visitData(), step: step });
    }
    function restoreDraft() {
        const saved = app.store.get('visit-draft', null);
        if (!saved || typeof saved !== 'object') return false;
        const visit = interval(saved.date, saved.time, saved.duration);
        if (!visit || visit.start <= Date.now()) return false;
        if (!validZone(saved.zone)) return false;
        if (!app.findProduct(app.tariffs, saved.tariff)) return false;
        selectedSeats = [];
        step = 0;
        for (const key of ['date', 'time', 'duration', 'tariff']) fields[key].value = saved[key];
        setZone(saved.zone, false);
        if (Array.isArray(saved.seats)) selectedSeats = saved.seats.filter((id, index) => {
            const seat = app.findProduct(app.seats, id);
            return seat && seat.zone === zone && saved.seats.indexOf(id) === index;
        });
        if (saved.step === 1 || saved.step === 2) step = saved.step;
        return true;
    }

    // 5. Проверяем контакты и сохраняем демо-заказ без личных данных.
    function submitOrder(event) {
        event.preventDefault();
        if (completed) return;
        if (step !== 2) { continueFlow(); return; }
        if (storageAvailable) syncOrders();
        if (!checkCart()) return;
        const lines = food.getCart();
        app.clearErrors(form);
        const contacts = app.validateContacts(fields.name.value, fields.email.value, fields.phone.value);
        if (fields.email.value.trim() === '') contacts.email = '';
        const deliverySeat = Number(byId('food-seat').value);
        const invalidSeat = lines.length > 0 && byId('food-delivery').value === 'seat' &&
            (!app.findProduct(app.seats, deliverySeat) || (selectedSeats.length > 0 && !selectedSeats.includes(deliverySeat)));
        const checks = [
            [fields.name, contacts.name], [fields.phone, contacts.phone], [fields.email, contacts.email],
            [byId('food-seat'), invalidSeat ? 'Выбери ПК, к которому нужно принести еду.' : ''],
            [fields.agreement, fields.agreement.checked ? '' : 'Подтверди, что проверил заказ и понимаешь демонстрационный режим.'],
            [fields.comment, fields.comment.value.trim().length > 1000 ? 'Сократи комментарий до 1 000 символов.' : '']
        ];
        const invalid = [];
        for (const [field, message] of checks) {
            if (app.setError(field, message)) invalid.push(field);
        }
        if (invalid.length > 0) {
            showMessage('booking-errors', 'Проверь отмеченные поля — и можно оформлять заказ.');
            const details = invalid[0].closest('details');
            if (details) details.open = true;
            invalid[0].focus();
            return;
        }
        showMessage('booking-errors', '');
        const id = app.reference('ORDER');
        const pcTotal = gamesPrice();
        const foodTotal = food.getTotal();
        const entry = {
            id: id, items: lines, delivery: byId('food-delivery').value,
            deliverySeat: Number(byId('food-seat').value), createdAt: new Date().toISOString()
        };
        const key = selectedSeats.length > 0 ? 'bookings' : 'orders';
        if (selectedSeats.length > 0) Object.assign(entry, visitData(), currentInterval());
        orders[key].push(entry);
        const saved = app.store.set(key, orders[key]);
        storageAvailable = saved;
        completed = true;
        form.hidden = true;
        document.querySelector('.booking-steps').hidden = true;
        showMessage('booking-step-error', '');
        showMessage('booking-feedback', '');
        byId('booking-success').hidden = false;
        byId('booking-success-reference').textContent = id;
        const details = byId('booking-success-details');
        details.replaceChildren();
        function detail(text) { details.append(element('p', '', text)); }
        detail('Для: ' + fields.name.value.trim() + ' · ' + fields.phone.value.trim());
        if (selectedSeats.length > 0) {
            detail(seatNames(selectedSeats) + ' · ' + zoneNames[zone]);
            detail(fields.date.value + ', ' + fields.time.value + ' по Астане · ' + fields.duration.value + ' ч.');
        }
        for (const line of lines) {
            const product = app.findProduct(app.menu, line.id);
            detail(product.name + ' × ' + line.quantity + ' · ' + app.money(product.price * line.quantity));
        }
        if (lines.length > 0) {
            let delivery = 'Получение еды: у стойки';
            if (entry.delivery === 'seat') delivery = 'Еду принести к PC ' + entry.deliverySeat;
            detail(delivery);
        }
        let price = 'Предварительно: ' + app.money(foodTotal);
        if (pcTotal !== null && selectedSeats.length > 0) price = 'Предварительно от ' + app.money(pcTotal + foodTotal);
        if (pcTotal === null) price = 'Стоимость Private уточняется в клубе. Еда: ' + app.money(foodTotal);
        detail(price);
        if (fields.comment.value.trim()) detail('Комментарий: ' + fields.comment.value.trim());
        if (byId('headphones').checked) detail('Пожелание: игровые наушники');
        let storageNote = 'Контакты не сохранены в браузерном хранилище и не отправлены на сервер.';
        if (!saved) storageNote = 'Браузер запретил сохранение. Демо-заказ доступен до перезагрузки. Контакты не отправлены на сервер.';
        byId('booking-storage-note').textContent = storageNote;
        selectedSeats = [];
        app.store.set('visit-draft', null);
        food.clear();
        renderReservations();
        refresh();
        byId('booking-success').focus();
        byId('booking-success').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function newBooking() {
        completed = false;
        selectedSeats = [];
        zone = 'main';
        fields.tariff.value = 'hour';
        defaultVisit();
        for (const name of ['name', 'phone', 'email', 'comment']) fields[name].value = '';
        fields.agreement.checked = false;
        byId('headphones').checked = false;
        app.clearErrors(form);
        byId('booking-success').hidden = true;
        form.hidden = false;
        document.querySelector('.booking-steps').hidden = false;
        showStep(0, true);
    }
    function renderReservation(item, onlyFood) {
        const row = element('li', 'reservation-row');
        const copy = element('div');
        if (onlyFood) {
            copy.append(element('strong', '', 'Еда и напитки · ' + app.money(app.cartTotals(item.items, app.menu).total)));
            for (const line of item.items) copy.append(element('p', '', app.findProduct(app.menu, line.id).name + ' × ' + line.quantity));
        } else {
            copy.append(element('strong', '', seatNames(item.seats) + ' · ' + zoneNames[item.zone]));
            copy.append(element('p', '', item.date + ' · ' + item.time + ' · ' + item.duration + ' ч.'));
            if (Array.isArray(item.items) && item.items.length > 0) copy.append(element('p', '', 'Еда и напитки включены в этот демо-заказ.'));
        }
        copy.append(element('small', '', item.id));
        const cancel = element('button', 'text-button', 'Отменить');
        cancel.type = 'button';
        cancel.dataset[onlyFood ? 'cancelOrder' : 'cancelBooking'] = item.id;
        cancel.setAttribute('aria-label', 'Отменить демо-заявку ' + item.id);
        cancel.addEventListener('click', () => cancelOrder(item.id, onlyFood));
        row.append(copy, cancel);
        return row;
    }
    function renderReservations() {
        const list = byId('local-bookings');
        list.replaceChildren();
        byId('local-booking-count').textContent = orders.bookings.length + orders.orders.length;
        for (const item of orders.bookings) list.append(renderReservation(item, false));
        for (const item of orders.orders) list.append(renderReservation(item, true));
        if (!list.children.length) list.append(element('li', 'field-help', 'Пока нет заявок. Здесь появятся твои демо-заказы.'));
    }
    function cancelOrder(id, onlyFood) {
        if (storageAvailable) syncOrders();
        const key = onlyFood ? 'orders' : 'bookings';
        const items = orders[key];
        const index = items.findIndex(item => item.id === id);
        if (index >= 0) items.splice(index, 1);
        const saved = app.store.set(key, items);
        storageAvailable = saved;
        let message = 'Демо-заказ отменён. Места освобождены на учебной схеме.';
        if (onlyFood) message = 'Демо-заказ еды отменён.';
        if (!saved) message += ' Сохранение недоступно, изменение действует до перезагрузки.';
        byId('local-bookings-status').textContent = message;
        renderReservations();
        refresh();
        byId('local-bookings-status').focus();
    }

    // 6. На телефоне та же корзина открывается в обычном диалоге браузера.
    function openCart() {
        if (dialog.open) return;
        dialog.append(cartContent);
        dialog.showModal();
        document.body.style.overflow = 'hidden';
    }
    dialog.addEventListener('close', function () {
        byId('order-rail').prepend(cartContent);
        document.body.style.overflow = '';
    });
    function onClick(selector, action) {
        for (const button of document.querySelectorAll(selector)) button.addEventListener('click', () => action(button));
    }
    onClick('#cart-open', openCart);
    onClick('#cart-close', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    window.addEventListener('resize', () => { if (window.innerWidth >= 1000 && dialog.open) dialog.close(); });
    onClick('[data-seat-id]', button => toggleSeat(Number(button.dataset.seatId)));
    onClick('[data-zone-pick]', button => { setZone(button.dataset.zonePick, true); changed(); });
    onClick('[data-tariff-pick]', button => setTariff(button.dataset.tariffPick));
    onClick('[data-step]', button => goToStep(Number(button.dataset.step)));
    onClick('[data-edit-step]', button => { dialog.close(); goToStep(Number(button.dataset.editStep)); });
    onClick('#booking-next, #cart-continue, #mobile-next', continueFlow);
    onClick('#booking-back', () => goToStep(Math.max(0, step - 1)));
    onClick('#choose-pc-button', () => goToStep(0));
    onClick('#food-only-button', () => { selectedSeats = []; showMessage('booking-step-error', ''); showStep(1, true); });
    onClick('#clear-seat-selection', () => { selectedSeats = []; changed(); });
    onClick('#duration-decrease', () => { fields.duration.stepDown(); changed(); });
    onClick('#duration-increase', () => { fields.duration.stepUp(); changed(); });
    onClick('#date-today', () => { fields.date.value = app.today(); changed(); });
    onClick('#date-tomorrow', () => { fields.date.value = tomorrow(); changed(); });
    form.addEventListener('input', function (event) {
        if (event.target === fields.date || event.target === fields.time || event.target === fields.duration) { showMessage('booking-step-error', ''); changed(); }
        else if (event.target.id) app.setError(event.target, '');
    });
    form.addEventListener('change', function (event) {
        if (event.target === fields.tariff) { setTariff(fields.tariff.value); return; }
        if (event.target === byId('food-delivery')) updateDelivery();
        if (event.target.id) app.setError(event.target, '');
    });
    byId('food-search').addEventListener('keydown', function (event) { if (event.key === 'Enter') event.preventDefault(); });
    form.addEventListener('submit', submitOrder);
    onClick('#new-booking-button', newBooking);
    food.onChange(refresh);
    window.addEventListener('storage', function (event) {
        if (event.key === 'topgame-visit-draft' && !completed) {
            syncingDraft = true;
            if (!restoreDraft()) {
                selectedSeats = [];
                step = 0;
            }
            showStep(step, false);
            syncingDraft = false;
            showMessage('booking-feedback', 'Выбор мест обновлён в другой вкладке.');
            return;
        }
        if (event.key === 'topgame-bookings' || event.key === 'topgame-orders' || event.key === null) {
            syncOrders();
            renderReservations();
            refresh();
            if (!completed) showMessage('booking-feedback', 'Заказы и занятость обновлены после изменения в другой вкладке.');
        }
    });
    byId('nav-cart').addEventListener('click', function (event) {
        event.preventDefault();
        const toggle = byId('main-navigation-toggle');
        toggle.checked = false;
        toggle.setAttribute('aria-expanded', 'false');
        history.replaceState(null, '', location.pathname + location.search + '#food-cart');
        if (window.innerWidth < 1000) openCart();
        else cartContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    function openFromHash() {
        if (['#seat-map', '#tariff-selection', '#gaming-zone-selection'].includes(location.hash)) showStep(0, false);
        if (location.hash === '#food-menu') showStep(1, false);
        if (location.hash === '#food-cart') { if (window.innerWidth < 1000) openCart(); else cartContent.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    window.addEventListener('hashchange', openFromHash);

    defaultVisit();
    restoreDraft();
    const params = new URLSearchParams(location.search);
    if (app.findProduct(app.tariffs, params.get('tariff'))) { fields.tariff.value = params.get('tariff'); step = 0; }
    if (fields.tariff.value === 'private') setZone('private', false);
    const initialZone = params.get('zone');
    if (validZone(initialZone)) { setZone(initialZone, false); step = 0; }
    if (app.validQuantity(Number(params.get('hours')), 12)) fields.duration.value = params.get('hours');
    if (fields.tariff.value === 'three-hours') fields.duration.value = '3';
    const initialDate = params.get('date');
    if (validDate(initialDate) && initialDate >= app.today()) fields.date.value = initialDate;
    if (params.get('game')) fields.comment.value = 'Предпочтительная игра: ' + params.get('game').slice(0, 150);
    renderReservations();
    showStep(step, false);
    openFromHash();
}

setupBooking();

// Fixed edition reference, retained for comparison.
'use strict';

(() => {
    const app = window.TopGame;
    const section = document.getElementById('computers-section-2');
    if (!app || !section) return;
    const grid = section.querySelector('.row');
    const equipment = [
        { id: 'main', name: 'Main', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 310, privacy: false, description: 'Общий зал для одиночной игры и матчей с друзьями.', article: 'computers-article-1' },
        { id: 'duo', name: 'Duo’s', processor: 'Ryzen 9600X', graphics: 'RTX 4070', memory: 32, refresh: 380, privacy: false, description: 'Места рядом для двух игроков.', article: 'computers-article-2' },
        { id: 'private', name: 'Private', processor: 'Ryzen 7800X3D', graphics: 'RTX 4070 Super', memory: 32, refresh: 380, privacy: true, description: 'Отдельное игровое пространство.', article: 'computers-article-3' }
    ].map(zone => ({ ...zone, capacity: app.seats.filter(seat => seat.zone === zone.id).length, node: document.getElementById(zone.article).parentElement }));
    let selected = [];
    const controls = app.el('form', 'row g-3 mb-4');
    controls.setAttribute('role', 'search');
    controls.setAttribute('aria-label', 'Подбор игрового оборудования');
    function makeControl(id, labelText, kind, choices) {
        const wrapper = app.el('div', 'col-12 col-md-4');
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
        field.id = id;
        if (choices) choices.forEach(([value, text]) => {
            const option = app.el('option', '', text);
            option.value = value;
            field.append(option);
        });
        wrapper.append(label, field);
        controls.append(wrapper);
        return field;
    }
    const search = makeControl('equipment-search', 'Зона, процессор или видеокарта', 'input');
    search.type = 'search';
    const refresh = makeControl('equipment-refresh', 'Минимальная частота монитора', 'select', [['0', 'Любая частота'], ['310', 'От 310 Hz'], ['380', 'От 380 Hz']]);
    const privacy = makeControl('equipment-private', 'Игровое пространство', 'select', [['all', 'Все зоны'], ['shared', 'Общий зал / Duo’s'], ['private', 'Отдельная зона']]);
    const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
    reset.type = 'button';
    reset.id = 'equipment-filter-reset';
    const count = app.el('p', 'mb-0');
    count.id = 'equipment-result-count';
    count.setAttribute('aria-live', 'polite');
    const actions = app.el('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
    actions.append(reset, count);
    controls.append(actions);
    grid.before(controls);

    const comparison = app.el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    comparison.id = 'equipment-comparison';
    const heading = app.el('h2', 'h2 fw-bold mb-3', 'Сравнить выбранные зоны');
    heading.id = 'equipment-comparison-title';
    comparison.setAttribute('aria-labelledby', heading.id);
    const comparisonStatus = app.el('p', 'mb-3');
    comparisonStatus.id = 'equipment-comparison-status';
    comparisonStatus.setAttribute('role', 'status');
    comparisonStatus.setAttribute('aria-live', 'polite');
    comparisonStatus.tabIndex = -1;
    const comparisonResult = app.el('div', 'row g-3 mb-3');
    comparisonResult.id = 'equipment-compare-result';
    const clear = app.el('button', 'btn btn-outline-secondary', 'Очистить сравнение');
    clear.type = 'button';
    clear.id = 'equipment-compare-clear';
    comparison.append(heading, comparisonStatus, comparisonResult, clear);
    section.after(comparison);

    function bookingLink(zone) {
        const params = new URLSearchParams({ zone: zone.id });
        if (zone.id === 'duo') params.set('players', '2');
        if (zone.id === 'private') params.set('tariff', 'private');
        return `booking.html?${params.toString()}#gaming-zone-selection`;
    }
    equipment.forEach(zone => {
        const article = document.getElementById(zone.article);
        article.querySelector('a').href = bookingLink(zone);
        const wrapper = app.el('div', 'form-check mt-3');
        const checkbox = app.el('input', 'form-check-input');
        checkbox.type = 'checkbox';
        checkbox.id = `compare-${zone.id}`;
        const label = app.el('label', 'form-check-label', `Сравнить ${zone.name}`);
        label.htmlFor = checkbox.id;
        wrapper.append(checkbox, label);
        article.querySelector('.card-body').append(wrapper);
        article.querySelector('.card-body').append(app.el('p', 'small text-body-secondary mt-3 mb-0', `Мест на демонстрационной схеме: ${zone.capacity}.`));
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) selected.push(zone.id);
            else selected = selected.filter(id => id !== zone.id);
            renderComparison();
        });
    });

    function renderEquipment() {
        const query = search.value.trim().toLocaleLowerCase('ru');
        const matches = equipment.filter(zone => `${zone.name} ${zone.processor} ${zone.graphics}`.toLocaleLowerCase('ru').includes(query)
            && zone.refresh >= Number(refresh.value)
            && (privacy.value === 'all' || zone.privacy === (privacy.value === 'private')));
        app.renderList(grid, matches, zone => zone.node, 'Подходящих зон нет. Измените характеристики или сбросьте фильтры.');
        count.textContent = `Найдено зон: ${matches.length} из ${equipment.length}`;
    }
    function renderComparisonCard(zone) {
        const column = app.el('div', 'col-12 col-md-6 col-lg-4');
        const card = app.el('article', 'card h-100');
        const body = app.el('div', 'card-body d-flex flex-column');
        body.append(app.el('h3', 'h4 fw-bold mb-3', zone.name));
        const specifications = app.el('dl', 'mb-3');
        [['Процессор', zone.processor], ['Видеокарта', zone.graphics], ['Память', `${zone.memory} GB`], ['Монитор', `ASUS ${zone.refresh} Hz`], ['Формат', zone.description], ['Мест на демонстрационной схеме', String(zone.capacity)]].forEach(([label, value]) => {
            specifications.append(app.el('dt', 'fw-semibold', label), app.el('dd', 'mb-2 text-break', value));
        });
        const next = app.el('a', 'btn btn-danger mb-2', 'Выбрать зону');
        next.href = bookingLink(zone);
        const remove = app.el('button', 'btn btn-outline-secondary', 'Убрать из сравнения');
        remove.type = 'button';
        remove.dataset.removeZone = zone.id;
        remove.addEventListener('click', () => {
            selected = selected.filter(id => id !== zone.id);
            renderComparison();
            if (clear.disabled) comparisonStatus.focus();
            else clear.focus();
        });
        body.append(specifications, next, remove);
        card.append(body);
        column.append(card);
        return column;
    }
    function renderComparison() {
        const choices = equipment.filter(zone => selected.includes(zone.id));
        equipment.forEach(zone => {
            // Nodes remain usable when a filter removes their wrapper from the document.
            zone.node.querySelector('article').classList.toggle('selected', selected.includes(zone.id));
            zone.node.querySelector(`#compare-${zone.id}`).checked = selected.includes(zone.id);
        });
        app.renderList(comparisonResult, choices, renderComparisonCard, 'Сравнение пусто. Отметьте зоны в карточках выше.');
        comparisonStatus.textContent = choices.length === 0 ? 'Выбрано зон: 0.' : `Выбрано зон: ${choices.length}. Характеристики взяты из исходного описания клуба; наличие мест проверьте при бронировании.`;
        clear.disabled = choices.length === 0;
    }
    controls.addEventListener('submit', event => { event.preventDefault(); renderEquipment(); });
    controls.addEventListener('input', renderEquipment);
    controls.addEventListener('change', renderEquipment);
    reset.addEventListener('click', () => { controls.reset(); renderEquipment(); search.focus(); });
    clear.addEventListener('click', () => {
        selected = [];
        renderComparison();
        search.focus();
    });
    renderEquipment();
    renderComparison();
})();

'use strict';

(() => {
    const app = window.TopGame;
    const main = document.getElementById('about-content');
    if (!app || !main) return;
    const stored = app.store.get('demo-reviews', []);
    let reviews = Array.isArray(stored) ? stored.filter(review => review && typeof review.id === 'string'
        && typeof review.name === 'string' && review.name.trim().length >= 2 && review.name.length <= 80
        && typeof review.text === 'string' && review.text.trim().length >= 20 && review.text.length <= 1000
        && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5
        && typeof review.createdAt === 'string' && Number.isFinite(Date.parse(review.createdAt))) : [];
    const section = app.el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    section.id = 'reviews';
    const heading = app.el('h2', 'h2 fw-bold mb-3', 'Ваш отзыв о клубе');
    heading.id = 'reviews-title';
    section.setAttribute('aria-labelledby', heading.id);
    section.append(heading, app.el('p', 'mb-3', 'Здесь можно попробовать форму отзыва. Демонстрационные отзывы сохраняются только в этом браузере и не отправляются в клуб. Опубликованных отзывов клиентов в исходных данных нет.'));
    const form = app.el('form', 'row g-3 mb-4');
    form.id = 'review-form';
    form.noValidate = true;
    function makeField(id, labelText, kind, classes) {
        const wrapper = app.el('div', classes);
        const label = app.el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
        field.id = id;
        field.name = id;
        field.required = true;
        wrapper.append(label, field);
        form.append(wrapper);
        return { wrapper, field };
    }
    const name = makeField('review-name', 'Имя', 'input', 'col-12 col-md-6');
    name.field.type = 'text';
    name.field.autocomplete = 'name';
    name.field.maxLength = 80;
    const rating = makeField('review-rating', 'Оценка от 1 до 5', 'select', 'col-12 col-md-6');
    const placeholder = app.el('option', '', 'Выберите оценку');
    placeholder.value = '';
    rating.field.append(placeholder);
    for (let value = 1; value <= 5; value += 1) {
        const option = app.el('option', '', `${value} из 5`);
        option.value = String(value);
        rating.field.append(option);
    }
    const text = makeField('review-text', 'Текст отзыва', 'textarea', 'col-12');
    text.field.rows = 5;
    text.field.minLength = 20;
    text.field.maxLength = 1000;
    const counter = app.el('p', 'form-text mb-0');
    counter.id = 'review-counter';
    counter.setAttribute('aria-live', 'polite');
    text.field.setAttribute('aria-describedby', counter.id);
    text.wrapper.append(counter);
    const submit = app.el('button', 'btn btn-danger', 'Добавить демонстрационный отзыв');
    submit.type = 'submit';
    submit.id = 'review-submit';
    const reset = app.el('button', 'btn btn-outline-secondary', 'Очистить форму');
    reset.type = 'reset';
    const formActions = app.el('div', 'col-12 d-flex flex-wrap gap-2');
    formActions.append(submit, reset);
    const status = app.el('p', 'col-12 hidden p-3 rounded-3 text-break');
    status.id = 'review-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.append(formActions, status);

    const reviewHeading = app.el('h3', 'h4 fw-bold mb-3', 'Отзывы из вашего браузера');
    const sortWrapper = app.el('div', 'row g-3 mb-3');
    const sortColumn = app.el('div', 'col-12 col-md-6');
    const sortLabel = app.el('label', 'form-label fw-semibold', 'Порядок отзывов');
    sortLabel.htmlFor = 'review-sort';
    const sort = app.el('select', 'form-select');
    sort.id = 'review-sort';
    [['newest', 'Сначала новые'], ['oldest', 'Сначала старые'], ['rating', 'Сначала высокая оценка']].forEach(([value, label]) => {
        const option = app.el('option', '', label);
        option.value = value;
        sort.append(option);
    });
    sortColumn.append(sortLabel, sort);
    const filterColumn = app.el('div', 'col-12 col-md-6');
    const filterLabel = app.el('label', 'form-label fw-semibold', 'Оценка');
    filterLabel.htmlFor = 'review-rating-filter';
    const filter = app.el('select', 'form-select');
    filter.id = 'review-rating-filter';
    for (let value = 0; value <= 5; value += 1) {
        const option = app.el('option', '', value === 0 ? 'Все оценки' : `${value} из 5`);
        option.value = String(value);
        filter.append(option);
    }
    filterColumn.append(filterLabel, filter);
    sortWrapper.append(sortColumn, filterColumn);
    const list = app.el('div', 'row g-3');
    list.id = 'review-list';
    const count = app.el('p', 'mb-3');
    count.id = 'review-result-count';
    count.setAttribute('aria-live', 'polite');
    const filterReset = app.el('button', 'btn btn-outline-secondary mb-3', 'Сбросить фильтр отзывов');
    filterReset.type = 'button';
    filterReset.id = 'review-filter-reset';
    section.append(form, reviewHeading, sortWrapper, filterReset, count, list);
    main.append(section);
    let attempted = false;
    let resetAfterSubmit = false;

    function validateReview() {
        app.clearErrors(form);
        const errors = [
            [name.field, name.field.value.trim().length < 2 || name.field.value.trim().length > 80 ? 'Имя должно содержать от 2 до 80 символов.' : ''],
            [rating.field, !Number.isInteger(Number(rating.field.value)) || Number(rating.field.value) < 1 || Number(rating.field.value) > 5 ? 'Выберите оценку от 1 до 5.' : ''],
            [text.field, text.field.value.trim().length < 20 || text.field.value.trim().length > 1000 ? 'Напишите от 20 до 1000 символов без учёта пробелов по краям.' : '']
        ];
        errors.forEach(([field, error]) => app.setError(field, error));
        return errors.filter(([, error]) => error).map(([field]) => field);
    }
    function updateCounter() {
        counter.textContent = `${text.field.value.length} / 1000 символов. Минимум 20 символов без пробелов по краям.`;
    }
    function saveReviews() {
        return app.store.set('demo-reviews', reviews);
    }
    function renderReview(review) {
        const column = app.el('div', 'col-12 col-lg-6');
        const card = app.el('article', 'card h-100');
        card.dataset.review = review.id;
        const body = app.el('div', 'card-body d-flex flex-column');
        const title = app.el('h4', 'h5 fw-bold text-break', review.name);
        const ratingText = app.el('p', 'fw-semibold mb-2', `Оценка: ${review.rating} из 5`);
        const date = app.el('time', 'small text-body-secondary mb-3');
        date.dateTime = review.createdAt;
        date.textContent = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(review.createdAt)) + ' (Астана)';
        const comment = app.el('p', 'text-break', review.text);
        const note = app.el('p', 'small text-body-secondary', 'Ваш демонстрационный отзыв. Сохранён только в этом браузере.');
        const remove = app.el('button', 'btn btn-outline-secondary mt-auto align-self-start', 'Удалить мой отзыв');
        remove.type = 'button';
        remove.dataset.removeReview = review.id;
        remove.addEventListener('click', () => {
            reviews = reviews.filter(item => item.id !== review.id);
            const saved = saveReviews();
            renderReviews();
            app.notify(status, saved ? 'Демонстрационный отзыв удалён из этого браузера.' : 'Отзыв удалён с текущей страницы. Браузер не разрешил обновить хранилище; после перезагрузки он может появиться снова.', '');
            sort.focus();
        });
        body.append(title, ratingText, date, comment, note, remove);
        card.append(body);
        column.append(card);
        return column;
    }
    function renderReviews() {
        const matches = reviews.filter(review => filter.value === '0' || review.rating === Number(filter.value));
        matches.sort((first, second) => sort.value === 'rating'
            ? second.rating - first.rating || Date.parse(second.createdAt) - Date.parse(first.createdAt)
            : sort.value === 'oldest' ? Date.parse(first.createdAt) - Date.parse(second.createdAt)
                : Date.parse(second.createdAt) - Date.parse(first.createdAt));
        app.renderList(list, matches, renderReview, reviews.length === 0 ? 'Отзывы пока не добавлены. Создайте свой демонстрационный отзыв в форме выше.' : 'Отзывов с такой оценкой нет. Выберите другую оценку или сбросьте фильтр.');
        count.textContent = `Показано отзывов: ${matches.length} из ${reviews.length}`;
    }
    function onFormEdit() {
        updateCounter();
        if (attempted) {
            const invalid = validateReview();
            if (invalid.length === 0) app.notify(status, 'Поля исправлены. Можно добавить демонстрационный отзыв.', '');
        } else status.classList.add('hidden');
    }
    form.addEventListener('input', onFormEdit);
    form.addEventListener('change', onFormEdit);
    form.addEventListener('submit', event => {
        event.preventDefault();
        attempted = true;
        const invalid = validateReview();
        if (invalid.length) {
            app.notify(status, `Отзыв не добавлен. Исправьте поля с ошибками: ${invalid.length}.`, 'error');
            invalid[0].focus();
            return;
        }
        const review = { id: app.reference('REVIEW'), name: name.field.value.trim(), rating: Number(rating.field.value), text: text.field.value.trim(), createdAt: new Date().toISOString() };
        reviews.push(review);
        const saved = saveReviews();
        filter.value = '0';
        sort.value = 'newest';
        renderReviews();
        resetAfterSubmit = true;
        form.reset();
        resetAfterSubmit = false;
        attempted = false;
        updateCounter();
        app.notify(status, saved ? 'Демонстрационный отзыв добавлен в этом браузере. Данные не отправлены на сервер и не опубликованы клубом.' : 'Демонстрационный отзыв добавлен на текущую страницу. Браузер не разрешил сохранение: после перезагрузки он исчезнет. Данные не отправлены на сервер.', 'success');
    });
    form.addEventListener('reset', () => {
        app.clearErrors(form);
        attempted = false;
        if (!resetAfterSubmit) {
            setTimeout(() => { updateCounter(); app.notify(status, 'Форма отзыва очищена.', ''); }, 0);
        }
    });
    sort.addEventListener('change', renderReviews);
    filter.addEventListener('change', renderReviews);
    filterReset.addEventListener('click', () => { filter.value = '0'; sort.value = 'newest'; renderReviews(); });
    updateCounter();
    renderReviews();
})();

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
    const snapshotOccupied = [3, 4, 8, 12, 17];
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

    const map = el('fieldset', 'bg-body-tertiary border rounded-3 p-3 p-md-4 mb-4');
    map.id = 'seat-map';
    map.tabIndex = -1;
    const mapLegend = el('legend', 'h4 fw-bold mb-3', 'Выберите компьютеры на карте');
    const zoneCapacityText = Object.keys(zoneNames).map(zone => `${zoneNames[zone]} — ${seats.filter(seat => seat.zone === zone).length}`).join(', ');
    const mapExplanation = el('p', 'small text-body-secondary mb-3', `Иллюстративная схема: ${seats.length} ПК, ${zoneCapacityText}. Расположение и занятость — учебные данные, а не карта реального клуба.`);
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
        const heading = el('h3', 'h6 fw-bold mb-3', `${zoneNames[zone]} · ${zoneSeats.length} ПК · демо-этаж ${zoneSeats[0].floor}`);
        const grid = el('div', 'row row-cols-3 row-cols-md-5 g-2');
        for (const seat of zoneSeats) {
            const column = el('div', 'col');
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
    const clearSelection = el('button', 'btn btn-outline-secondary btn-sm', 'Снять выбор мест');
    clearSelection.type = 'button';
    clearSelection.id = 'clear-seat-selection';
    clearSelection.addEventListener('click', () => {
        selectedSeats = [];
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
            return requested && requested.start === item.start && requested.end === item.end && Array.isArray(item.seats) && item.seats.length > 0 && item.seats.every((id, index) => item.seats.indexOf(id) === index) && item.seats.every(id => seats.some(seat => seat.id === id && seat.zone === item.zone));
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
        if (!requestedInterval) return snapshotOccupied.slice();
        const busy = [];
        function addBusy(id) {
            if (!busy.includes(id)) busy.push(id);
        }
        // A fixed sample session demonstrates overlap logic, not live club availability.
        const sampleSession = interval(today(), '18:00', 3);
        if (overlaps(requestedInterval, sampleSession)) snapshotOccupied.forEach(id => addBusy(id));
        reservations.filter(item => overlaps(requestedInterval, item)).forEach(item => item.seats.forEach(id => addBusy(id)));
        return busy;
    }

    function chooseZone(zone) {
        zoneRadios.forEach(radio => { radio.checked = radio.value === zone; });
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
            selectedSeats = selectedSeats.filter(id => id !== seat.id);
            notify(mapFeedback, `PC ${seat.id} исключён из выбора.`);
        } else {
            const count = Number(fields.players.value);
            if (Number.isInteger(count) && count > 0 && selectedSeats.length >= count) {
                notify(mapFeedback, `Для ${count} игроков уже выбрано ${count} ПК. Снимите один выбор или увеличьте количество игроков.`, 'error');
                return;
            }
            selectedSeats.push(seat.id);
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
        const context = requestedInterval ? `${data.date}, ${data.time}, ${data.duration} ч. по Астане.` : 'Демоснимок: укажите дату, время и длительность для проверки пересечений.';
        const sameAcceptedChoice = lastAccepted?.fingerprint === JSON.stringify(data);
        const conflictHint = requestedInterval && !sameAcceptedChoice && data.seats.some(id => busy.includes(id)) ? ' Один из выбранных ПК занят в этом интервале. Нажмите «Снять выбор мест», затем выберите свободные ПК или измените время.' : '';
        mapStatus.textContent = `${context} Свободно: ${freeCount}. Занято: ${busy.length}. Выбрано: ${selectedSeats.length} из ${Number.isInteger(data.players) && data.players > 0 ? data.players : '—'}.${conflictHint}`;
        clearSelection.disabled = selectedSeats.length === 0;
    }

    function refresh() {
        const data = values();
        fields.date.min = today();
        fields.players.max = String(data.zone === 'duo' ? 2 : data.zone ? seats.filter(seat => seat.zone === data.zone).length : seats.length);
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
        const capacity = data.zone ? seats.filter(seat => seat.zone === data.zone).length : seats.length;
        const countError = !Number.isInteger(data.players) || data.players < 1 ? 'Количество игроков должно быть целым числом от 1.' : data.players > capacity ? `В выбранной зоне только ${capacity} демонстрационных ПК.` : data.zone === 'duo' && data.players !== 2 ? 'Зона DUO предназначена для двух игроков: укажите ровно 2.' : '';
        check(fields.players, countError);
        check(duration, !Number.isInteger(data.duration) || data.duration < 1 || data.duration > 12 ? 'Укажите целое количество часов от 1 до 12.' : data.tariff === 'three-hours' && data.duration !== 3 ? 'Для тарифа «3 часа» укажите ровно 3 часа.' : '');
        check(fields.tariff, !tariffs.some(tariff => tariff.id === data.tariff) ? 'Выберите тариф из списка.' : data.zone && ((data.zone === 'private') !== (data.tariff === 'private')) ? 'Для зоны PRIVATE нужен тариф PRIVATE; этот тариф применяется только к PRIVATE.' : '');
        check(zoneFieldset, data.zone ? '' : 'Выберите игровую зону или свободный ПК на карте.', zoneRadios[0]);
        const requestedInterval = interval(data.date, data.time, data.duration);
        const busy = occupiedSeats(requestedInterval);
        const duplicate = lastAccepted && lastAccepted.fingerprint === JSON.stringify(data) && reservations.some(item => item.id === lastAccepted.id);
        let seatError = data.seats.length !== data.players ? `Выберите ровно ${Number.isInteger(data.players) && data.players > 0 ? data.players : 'по одному'} ПК: сейчас выбрано ${data.seats.length}.` : data.seats.some(id => seats.find(seat => seat.id === id)?.zone !== data.zone) ? 'Все выбранные ПК должны находиться в одной выбранной зоне.' : '';
        if (!seatError && !duplicate && requestedInterval && data.seats.some(id => busy.includes(id))) seatError = 'Выбранный ПК занят в пересекающееся время на демо-схеме. Снимите выбор и выберите свободные места или другой интервал.';
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
            const removed = selectedSeats.length;
            selectedSeats = [];
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
})();
