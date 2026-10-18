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
    const cartContent = byId('cart-content');
    const dialog = byId('cart-dialog');
    let selectedSeats = [];
    let zone = 'main';
    let step = 0;
    let foodOnly = false;
    let completed = false;
    let storageAvailable = true;
    let syncingDraft = false;
    let reservations = readReservations();
    let foodOrders = readFoodOrders();

    // 1. Дата и время всегда по Астане, даже если посетитель в другом часовом поясе.
    function dateInAstana(date) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }
    function defaultVisit() {
        const nextHour = new Date(Date.now() + 60 * 60 * 1000);
        fields.date.value = dateInAstana(nextHour);
        const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Almaty', hour: '2-digit', hourCycle: 'h23' }).format(nextHour);
        fields.time.value = hour + ':00';
        fields.duration.value = '2';
    }
    function validDate(date) {
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
        const parts = date.split('-');
        const check = new Date(date + 'T12:00:00+05:00');
        return Number.isFinite(check.getTime()) && dateInAstana(check) === date && Number(parts[0]) >= 2020;
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
        const result = [];
        for (const id of ids) result.push('PC ' + String(id).padStart(2, '0'));
        return result.join(', ');
    }
    function readReservations() {
        const saved = app.store.get('bookings', []);
        const result = [];
        if (!Array.isArray(saved)) return result;
        for (const item of saved) {
            if (!item || typeof item.id !== 'string' || item.id.length > 80) continue;
            if (item.zone !== 'main' && item.zone !== 'duo' && item.zone !== 'private') continue;
            if (!app.findProduct(app.tariffs, item.tariff)) continue;
            const visit = interval(item.date, item.time, item.duration);
            if (!visit || item.start !== visit.start || item.end !== visit.end) continue;
            if (!Array.isArray(item.seats) || item.seats.length < 1) continue;
            let valid = true;
            for (let index = 0; index < item.seats.length; index++) {
                const id = item.seats[index];
                const seat = app.findProduct(app.seats, id);
                if (!seat || seat.zone !== item.zone || item.seats.indexOf(id) !== index) valid = false;
            }
            if (valid) result.push(item);
        }
        return result;
    }
    function readFoodOrders() {
        const saved = app.store.get('orders', []);
        const result = [];
        if (!Array.isArray(saved)) return result;
        for (const item of saved) {
            if (!item || typeof item.id !== 'string' || item.id.length > 80 || !Array.isArray(item.items) || item.items.length === 0) continue;
            let valid = true;
            for (const line of item.items) {
                if (!line || !app.findProduct(app.menu, line.id) || !app.validQuantity(line.quantity, 20)) valid = false;
            }
            if (valid) result.push(item);
        }
        return result;
    }
    function busySeats() {
        const requested = currentInterval();
        const busy = [];
        if (!requested) return busy;
        // Учебный сеанс показывает, как проверяются пересечения времени.
        const sample = interval(app.today(), '18:00', 3);
        if (overlaps(requested, sample)) {
            for (const id of [3, 4, 8, 12, 17]) busy.push(id);
        }
        for (const item of reservations) {
            if (!overlaps(requested, item)) continue;
            for (const id of item.seats) {
                if (!busy.includes(id)) busy.push(id);
            }
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
        if (!zoneNames[nextZone]) return;
        const changed = zone !== nextZone;
        if (changed && selectedSeats.length > 0) {
            selectedSeats = [];
            if (explain) showMessage('booking-feedback', 'Выбрана зона ' + zoneNames[nextZone] + '. Предыдущие места сняты — выбери новые на схеме.');
        }
        zone = nextZone;
        if (zone === 'private') fields.tariff.value = 'private';
        else if (fields.tariff.value === 'private') fields.tariff.value = 'hour';
        for (const radio of form.querySelectorAll('[name="gaming-zone"]')) radio.checked = radio.value === zone;
    }
    function setTariff(id) {
        if (!app.findProduct(app.tariffs, id)) return;
        fields.tariff.value = id;
        if (id === 'private') setZone('private', true);
        else if (zone === 'private') setZone('main', true);
        if (id === 'three-hours') fields.duration.value = '3';
        saveDraft();
        refresh();
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
        selectedSeats.sort(function (first, second) { return first - second; });
        foodOnly = false;
        showMessage('booking-step-error', '');
        saveDraft();
        refresh();
    }
    function removeSeat(id) {
        const index = selectedSeats.indexOf(id);
        if (index < 0) return;
        selectedSeats.splice(index, 1);
        if (selectedSeats.length === 0 && food.getCart().length > 0) foodOnly = true;
        saveDraft();
        refresh();
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
            const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(end);
            let suffix = '';
            if (dateInAstana(end) !== fields.date.value) suffix = ' · следующий день';
            byId('visit-end-time').textContent = 'До ' + time + suffix;
        }
        fields.date.min = app.today();
        byId('date-today').setAttribute('aria-pressed', String(fields.date.value === app.today()));
        const tomorrow = dateInAstana(new Date(app.localDateTime(app.today(), '12:00') + 24 * 60 * 60 * 1000));
        byId('date-tomorrow').setAttribute('aria-pressed', String(fields.date.value === tomorrow));
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
    function element(tag, classes, text) { return app.el(tag, classes, text); }
    function renderPcItem(id) {
        const item = element('div', 'cart-item');
        const icon = element('span', 'cart-item-icon');
        icon.append(element('span', 'pc-display'));
        icon.setAttribute('aria-hidden', 'true');
        const copy = element('div', 'cart-item-copy');
        const tariff = app.findProduct(app.tariffs, fields.tariff.value);
        copy.append(element('strong', '', 'PC ' + String(id).padStart(2, '0') + ' · ' + zoneNames[zone]));
        copy.append(element('small', '', fields.duration.value + ' ч. · ' + tariff.name));
        let price = 'Уточняется';
        const total = gamesPrice();
        if (total !== null) price = app.money(total / selectedSeats.length);
        const remove = element('button', 'remove-item', '×');
        remove.type = 'button';
        remove.dataset.removeSeat = id;
        remove.setAttribute('aria-label', 'Убрать PC ' + id + ' из заказа');
        remove.addEventListener('click', function () { removeSeat(id); });
        item.append(icon, copy, element('span', 'cart-item-price', price), remove);
        return item;
    }
    function foodAction(id, action, text, label) {
        const button = element('button', 'quantity-button', text);
        button.type = 'button';
        button.id = 'cart-' + id + '-' + action;
        button.dataset.foodId = id;
        button.dataset.foodAction = action;
        button.setAttribute('aria-label', label);
        button.addEventListener('click', function () {
            if (action === 'remove') food.removeItem(id);
            else if (action === 'increase') food.changeQuantity(id, 1);
            else food.changeQuantity(id, -1);
            const replacement = byId('cart-' + id + '-' + action);
            if (replacement && !replacement.disabled) replacement.focus();
            else byId('cart-title').focus();
        });
        return button;
    }
    function renderFoodItem(line) {
        const product = app.findProduct(app.menu, line.id);
        const item = element('div', 'cart-item');
        const image = element('img', '');
        image.src = product.image;
        image.alt = '';
        const copy = element('div', 'cart-item-copy');
        copy.append(element('strong', '', product.name));
        const actions = element('div', 'cart-food-actions');
        const counter = element('div', 'quantity-control');
        const minus = foodAction(product.id, 'decrease', '−', 'Уменьшить количество: ' + product.name);
        const plus = foodAction(product.id, 'increase', '+', 'Увеличить количество: ' + product.name);
        plus.disabled = line.quantity >= 20;
        counter.append(minus, element('span', 'quantity-value', line.quantity), plus);
        actions.append(counter, element('span', 'cart-item-price', app.money(product.price * line.quantity)));
        copy.append(actions);
        const remove = foodAction(product.id, 'remove', '×', 'Удалить: ' + product.name);
        remove.className = 'remove-item';
        item.append(image, copy, remove);
        return item;
    }
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
        byId('cart-pc-items').replaceChildren();
        byId('cart-food-items').replaceChildren();
        for (const id of selectedSeats) byId('cart-pc-items').append(renderPcItem(id));
        for (const line of lines) byId('cart-food-items').append(renderFoodItem(line));
        let visitText = fields.date.value + ' · ' + fields.time.value + ' · ' + fields.duration.value + ' ч.';
        if (validDate(fields.date.value)) {
            const date = new Date(fields.date.value + 'T12:00:00+05:00');
            visitText = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: 'long' }).format(date) + ' · ' + fields.time.value + ' · ' + fields.duration.value + ' ч.';
        }
        byId('cart-visit').textContent = visitText;
        const pcTotal = gamesPrice();
        const foodTotal = food.getTotal();
        let total = app.money(foodTotal);
        let pcText = '0 ₸';
        let note = 'Цены «от». Итоговую стоимость подтвердит администратор.';
        if (selectedSeats.length > 0 && pcTotal !== null) {
            pcText = 'от ' + app.money(pcTotal);
            total = 'от ' + app.money(pcTotal + foodTotal);
        }
        if (pcTotal === null) {
            pcText = 'Уточняется';
            total = 'Уточняется';
            note = 'Private — от 2 500 ₸. Стоимость группы и период оплаты уточняются. Еда указана отдельно.';
            if (fields.tariff.value !== 'private') note = 'Укажи от 1 до 12 полных часов, чтобы рассчитать стоимость.';
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
        select.replaceChildren();
        const placeholder = element('option', '', 'Выбери ПК');
        placeholder.value = '';
        select.append(placeholder);
        for (const seat of app.seats) {
            if (selectedSeats.length > 0 && !selectedSeats.includes(seat.id)) continue;
            const option = element('option', '', 'PC ' + String(seat.id).padStart(2, '0') + ' · ' + zoneNames[seat.zone]);
            option.value = seat.id;
            select.append(option);
        }
        select.value = previous;
        if (!select.value && selectedSeats.length > 0) select.value = String(selectedSeats[0]);
        const toSeat = byId('food-delivery').value === 'seat';
        byId('food-seat-column').hidden = !toSeat;
        select.disabled = !toSeat;
        byId('delivery-help').textContent = 'Еду принесём к одному из выбранных мест.';
        if (selectedSeats.length === 0) byId('delivery-help').textContent = 'Если уже играешь в клубе, укажи свой ПК. Можно также забрать заказ у стойки.';
        if (!toSeat) byId('delivery-help').textContent = 'Готовый заказ можно будет забрать у стойки.';
    }
    function refresh() {
        updateMap();
        renderCart();
        updateDelivery();
        let label = 'Дальше: еда →';
        if (step === 1) label = 'Дальше: контакты →';
        if (step === 2) label = 'Создать демо-заявку ↗';
        if (completed) label = 'Собрать новый заказ ↗';
        byId('cart-continue').textContent = label;
        byId('mobile-next').textContent = 'Дальше →';
        if (step === 2) byId('mobile-next').textContent = 'Оформить ↗';
        if (completed) byId('mobile-next').textContent = 'Новый заказ ↗';
        byId('booking-next').textContent = label;
        if (step === 1 && food.getCart().length === 0 && !foodOnly) byId('booking-next').textContent = 'Без еды, к контактам →';
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
        for (const id of selectedSeats) {
            if (busy.includes(id)) return 'Один из выбранных ПК занят на это время. Убери его из корзины или измени время.';
        }
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
        byId('choose-pc-button').hidden = !foodOnly || step === 0;
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
    function goToStep(next) {
        if (completed) return;
        showMessage('booking-step-error', '');
        if (next === 0) { foodOnly = false; showStep(0, true); return; }
        if (selectedSeats.length > 0) {
            const error = validateVisit();
            if (error) { showStep(0, true); showMessage('booking-step-error', error); return; }
        } else foodOnly = true;
        if (next === 2 && selectedSeats.length === 0 && food.getCart().length === 0) {
            showStep(1, true);
            showMessage('booking-step-error', 'Корзина пока пустая. Добавь еду или выбери ПК.');
            return;
        }
        showStep(next, true);
    }
    function continueFlow() {
        if (dialog.open) dialog.close();
        if (completed) { newBooking(); return; }
        if (step === 0) {
            const error = validateVisit();
            if (error) {
                showMessage('booking-step-error', error);
                if (!selectedSeats.length) byId('seat-map').focus();
                else fields.date.focus();
                return;
            }
            foodOnly = false;
            goToStep(1);
        } else if (step === 1) goToStep(2);
        else form.requestSubmit();
    }
    function saveDraft() {
        if (completed || syncingDraft) return;
        app.store.set('visit-draft', {
            date: fields.date.value, time: fields.time.value, duration: Number(fields.duration.value),
            tariff: fields.tariff.value, zone: zone, seats: selectedSeats,
            foodOnly: foodOnly, step: step
        });
    }
    function restoreDraft() {
        const saved = app.store.get('visit-draft', null);
        if (!saved || typeof saved !== 'object') return false;
        const visit = interval(saved.date, saved.time, saved.duration);
        if (!visit || visit.start <= Date.now()) return false;
        if (saved.zone !== 'main' && saved.zone !== 'duo' && saved.zone !== 'private') return false;
        if (!app.findProduct(app.tariffs, saved.tariff)) return false;
        selectedSeats = [];
        step = 0;
        fields.date.value = saved.date;
        fields.time.value = saved.time;
        fields.duration.value = saved.duration;
        fields.tariff.value = saved.tariff;
        setZone(saved.zone, false);
        if (Array.isArray(saved.seats)) {
            for (const id of saved.seats) {
                const seat = app.findProduct(app.seats, id);
                if (seat && seat.zone === zone && !selectedSeats.includes(id)) selectedSeats.push(id);
            }
        }
        foodOnly = saved.foodOnly === true;
        if (saved.step === 1 || saved.step === 2) step = saved.step;
        return true;
    }

    // 5. Проверяем контакты и сохраняем демо-заказ без личных данных.
    function submitOrder(event) {
        event.preventDefault();
        if (completed) return;
        if (step !== 2) { continueFlow(); return; }
        if (storageAvailable) reservations = readReservations();
        const lines = food.getCart();
        if (selectedSeats.length > 0) {
            const error = validateVisit();
            if (error) { showStep(0, true); showMessage('booking-step-error', error); return; }
        } else if (lines.length === 0) {
            showStep(1, true);
            showMessage('booking-step-error', 'Корзина пустая. Добавь товары или выбери ПК.');
            return;
        }
        app.clearErrors(form);
        const contacts = app.validateContacts(fields.name.value, fields.email.value, fields.phone.value);
        if (fields.email.value.trim() === '') contacts.email = '';
        const invalid = [];
        function check(field, message) {
            if (app.setError(field, message)) invalid.push(field);
        }
        check(fields.name, contacts.name);
        check(fields.phone, contacts.phone);
        check(fields.email, contacts.email);
        let deliveryError = '';
        if (lines.length > 0 && byId('food-delivery').value === 'seat') {
            const id = Number(byId('food-seat').value);
            if (!app.findProduct(app.seats, id) || (selectedSeats.length > 0 && !selectedSeats.includes(id))) deliveryError = 'Выбери ПК, к которому нужно принести еду.';
        }
        check(byId('food-seat'), deliveryError);
        let agreementError = '';
        if (!fields.agreement.checked) agreementError = 'Подтверди, что проверил заказ и понимаешь демонстрационный режим.';
        check(fields.agreement, agreementError);
        let commentError = '';
        if (fields.comment.value.trim().length > 1000) commentError = 'Сократи комментарий до 1 000 символов.';
        check(fields.comment, commentError);
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
        const requested = currentInterval();
        const entry = {
            id: id, items: lines, delivery: byId('food-delivery').value,
            deliverySeat: Number(byId('food-seat').value), createdAt: new Date().toISOString()
        };
        let saved = true;
        if (selectedSeats.length > 0) {
            entry.date = fields.date.value;
            entry.time = fields.time.value;
            entry.duration = Number(fields.duration.value);
            entry.zone = zone;
            entry.tariff = fields.tariff.value;
            entry.seats = selectedSeats.slice();
            entry.start = requested.start;
            entry.end = requested.end;
            reservations.push(entry);
            saved = app.store.set('bookings', reservations);
        } else {
            foodOrders.push(entry);
            saved = app.store.set('orders', foodOrders);
        }
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
        details.append(element('p', '', 'Для: ' + fields.name.value.trim() + ' · ' + fields.phone.value.trim()));
        if (selectedSeats.length > 0) {
            details.append(element('p', '', seatNames(selectedSeats) + ' · ' + zoneNames[zone]));
            details.append(element('p', '', fields.date.value + ', ' + fields.time.value + ' по Астане · ' + fields.duration.value + ' ч.'));
        }
        for (const line of lines) {
            const product = app.findProduct(app.menu, line.id);
            details.append(element('p', '', product.name + ' × ' + line.quantity + ' · ' + app.money(product.price * line.quantity)));
        }
        if (lines.length > 0) {
            let delivery = 'Получение еды: у стойки';
            if (entry.delivery === 'seat') delivery = 'Еду принести к PC ' + entry.deliverySeat;
            details.append(element('p', '', delivery));
        }
        let price = 'Предварительно: ' + app.money(foodTotal);
        if (pcTotal !== null && selectedSeats.length > 0) price = 'Предварительно от ' + app.money(pcTotal + foodTotal);
        if (pcTotal === null) price = 'Стоимость Private уточняется в клубе. Еда: ' + app.money(foodTotal);
        details.append(element('p', '', price));
        if (fields.comment.value.trim()) details.append(element('p', '', 'Комментарий: ' + fields.comment.value.trim()));
        if (byId('headphones').checked) details.append(element('p', '', 'Пожелание: игровые наушники'));
        let storageNote = 'Контакты не сохранены в браузерном хранилище и не отправлены на сервер.';
        if (!saved) storageNote = 'Браузер запретил сохранение. Демо-заказ доступен до перезагрузки. Контакты не отправлены на сервер.';
        byId('booking-storage-note').textContent = storageNote;
        selectedSeats = [];
        app.store.set('visit-draft', null);
        food.clear();
        renderReservations();
        refresh();
        byId('cart-continue').textContent = 'Собрать новый заказ ↗';
        byId('mobile-next').textContent = 'Новый заказ ↗';
        byId('booking-success').focus();
        byId('booking-success').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function newBooking() {
        completed = false;
        foodOnly = false;
        selectedSeats = [];
        zone = 'main';
        fields.tariff.value = 'hour';
        defaultVisit();
        fields.name.value = '';
        fields.phone.value = '';
        fields.email.value = '';
        fields.comment.value = '';
        fields.agreement.checked = false;
        byId('headphones').checked = false;
        app.clearErrors(form);
        byId('booking-success').hidden = true;
        form.hidden = false;
        document.querySelector('.booking-steps').hidden = false;
        showStep(0, true);
    }
    function renderReservations() {
        const list = byId('local-bookings');
        list.replaceChildren();
        byId('local-booking-count').textContent = reservations.length + foodOrders.length;
        for (const item of reservations) {
            const row = element('li', 'reservation-row');
            const copy = element('div', '');
            copy.append(element('strong', '', seatNames(item.seats) + ' · ' + zoneNames[item.zone]));
            copy.append(element('p', '', item.date + ' · ' + item.time + ' · ' + item.duration + ' ч.'));
            if (Array.isArray(item.items) && item.items.length > 0) copy.append(element('p', '', 'Еда и напитки включены в этот демо-заказ.'));
            copy.append(element('small', '', item.id));
            const cancel = element('button', 'text-button', 'Отменить');
            cancel.type = 'button';
            cancel.dataset.cancelBooking = item.id;
            cancel.setAttribute('aria-label', 'Отменить демо-заявку ' + item.id);
            cancel.addEventListener('click', function () { cancelOrder(item.id, false); });
            row.append(copy, cancel);
            list.append(row);
        }
        for (const item of foodOrders) {
            const row = element('li', 'reservation-row');
            const copy = element('div', '');
            copy.append(element('strong', '', 'Еда и напитки · ' + app.money(app.cartTotals(item.items, app.menu).total)));
            for (const line of item.items) copy.append(element('p', '', app.findProduct(app.menu, line.id).name + ' × ' + line.quantity));
            copy.append(element('small', '', item.id));
            const cancel = element('button', 'text-button', 'Отменить');
            cancel.type = 'button';
            cancel.dataset.cancelOrder = item.id;
            cancel.addEventListener('click', function () { cancelOrder(item.id, true); });
            row.append(copy, cancel);
            list.append(row);
        }
        if (list.children.length === 0) list.append(element('li', 'field-help', 'Пока нет заявок. Здесь появятся твои демо-заказы.'));
    }
    function cancelOrder(id, onlyFood) {
        if (storageAvailable) { reservations = readReservations(); foodOrders = readFoodOrders(); }
        let items = reservations;
        let key = 'bookings';
        if (onlyFood) { items = foodOrders; key = 'orders'; }
        for (let index = 0; index < items.length; index++) {
            if (items[index].id === id) { items.splice(index, 1); break; }
        }
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
    byId('cart-open').addEventListener('click', openCart);
    byId('cart-close').addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1000 && dialog.open) dialog.close(); });
    for (const button of document.querySelectorAll('[data-seat-id]')) {
        button.addEventListener('click', function () { toggleSeat(Number(button.dataset.seatId)); });
    }
    for (const button of document.querySelectorAll('[data-zone-pick]')) {
        button.addEventListener('click', function () { setZone(button.dataset.zonePick, true); foodOnly = false; saveDraft(); refresh(); });
    }
    for (const button of document.querySelectorAll('[data-tariff-pick]')) {
        button.addEventListener('click', function () { setTariff(button.dataset.tariffPick); });
    }
    for (const button of document.querySelectorAll('[data-step]')) button.addEventListener('click', function () { goToStep(Number(button.dataset.step)); });
    for (const button of document.querySelectorAll('[data-edit-step]')) button.addEventListener('click', function () { if (dialog.open) dialog.close(); goToStep(Number(button.dataset.editStep)); });
    byId('booking-next').addEventListener('click', continueFlow);
    byId('cart-continue').addEventListener('click', continueFlow);
    byId('mobile-next').addEventListener('click', continueFlow);
    byId('booking-back').addEventListener('click', function () { goToStep(Math.max(0, step - 1)); });
    byId('choose-pc-button').addEventListener('click', function () { goToStep(0); });
    byId('food-only-button').addEventListener('click', function () {
        selectedSeats = [];
        foodOnly = true;
        showMessage('booking-step-error', '');
        showStep(1, true);
    });
    byId('clear-seat-selection').addEventListener('click', function () { selectedSeats = []; saveDraft(); refresh(); });
    byId('duration-decrease').addEventListener('click', function () { fields.duration.stepDown(); saveDraft(); refresh(); });
    byId('duration-increase').addEventListener('click', function () { fields.duration.stepUp(); saveDraft(); refresh(); });
    byId('date-today').addEventListener('click', function () { fields.date.value = app.today(); saveDraft(); refresh(); });
    byId('date-tomorrow').addEventListener('click', function () { fields.date.value = dateInAstana(new Date(app.localDateTime(app.today(), '12:00') + 24 * 60 * 60 * 1000)); saveDraft(); refresh(); });
    form.addEventListener('input', function (event) {
        if (event.target === fields.date || event.target === fields.time || event.target === fields.duration) { showMessage('booking-step-error', ''); saveDraft(); refresh(); }
        else if (event.target.id) app.setError(event.target, '');
    });
    form.addEventListener('change', function (event) {
        if (event.target === fields.tariff) { setTariff(fields.tariff.value); return; }
        if (event.target.name === 'gaming-zone') { setZone(event.target.value, true); saveDraft(); refresh(); return; }
        if (event.target === byId('food-delivery')) updateDelivery();
        if (event.target.id) app.setError(event.target, '');
    });
    byId('food-search').addEventListener('keydown', function (event) { if (event.key === 'Enter') event.preventDefault(); });
    form.addEventListener('submit', submitOrder);
    byId('new-booking-button').addEventListener('click', newBooking);
    food.onChange(function () { refresh(); });
    window.addEventListener('storage', function (event) {
        if (event.key === 'topgame-visit-draft' && !completed) {
            syncingDraft = true;
            if (!restoreDraft()) {
                selectedSeats = [];
                foodOnly = false;
                step = 0;
            }
            showStep(step, false);
            syncingDraft = false;
            showMessage('booking-feedback', 'Выбор мест обновлён в другой вкладке.');
            return;
        }
        if (event.key === 'topgame-bookings' || event.key === 'topgame-orders' || event.key === null) {
            reservations = readReservations();
            foodOrders = readFoodOrders();
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
        if (location.hash === '#seat-map' || location.hash === '#tariff-selection' || location.hash === '#gaming-zone-selection') {
            foodOnly = false;
            showStep(0, false);
        }
        if (location.hash === '#food-menu') { if (!selectedSeats.length) foodOnly = true; showStep(1, false); }
        if (location.hash === '#food-cart') { if (window.innerWidth < 1000) openCart(); else cartContent.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    window.addEventListener('hashchange', openFromHash);

    defaultVisit();
    restoreDraft();
    const params = new URLSearchParams(location.search);
    if (app.findProduct(app.tariffs, params.get('tariff'))) { fields.tariff.value = params.get('tariff'); step = 0; }
    if (fields.tariff.value === 'private') setZone('private', false);
    const initialZone = params.get('zone');
    if (initialZone === 'main' || initialZone === 'duo' || initialZone === 'private') { setZone(initialZone, false); step = 0; }
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
