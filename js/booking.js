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
