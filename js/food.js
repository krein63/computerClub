'use strict';

(() => {
    const { el, money, menu, seats, store, renderList, setError, clearErrors, validateContacts, notify, reference } = window.TopGame;
    const categoryNames = { food: 'Еда', snacks: 'Снеки', drinks: 'Напитки' };
    const maxQuantity = 20;
    let cart = readCart();
    const nav = document.querySelector('#main-navigation .navbar-nav');
    const cartLink = el('a', 'nav-link px-2');
    cartLink.id = 'nav-cart';
    cartLink.href = 'booking.html#food-cart';
    const navItem = el('li', 'nav-item');
    navItem.append(cartLink);
    if (nav) nav.append(navItem);

    function readCart() {
        const stored = store.get('cart', []);
        if (!Array.isArray(stored)) return [];
        // Восстанавливаем только доступные товары; повторные строки объединяем.
        const restored = [];
        for (const line of stored) {
            if (!line) continue;
            const product = menu.find(item => item.id === line.id);
            if (!product || !product.available || !Number.isInteger(line.quantity) || line.quantity < 1) continue;
            const existing = restored.find(item => item.id === line.id);
            if (existing) existing.quantity = Math.min(maxQuantity, existing.quantity + line.quantity);
            else restored.push({ id: line.id, quantity: Math.min(maxQuantity, line.quantity) });
        }
        return restored;
    }

    function cartTotals(lines) {
        return window.TopGameLogic.cartTotals(lines, menu);
    }

    function updateBadge() {
        cartLink.textContent = `Корзина · ${cartTotals(cart).quantity}`;
    }
    updateBadge();

    const resultContainer = document.getElementById('booking-result');
    if (!resultContainer) {
        window.addEventListener('storage', event => {
            if (event.key === 'topgame-cart') {
                cart = readCart();
                updateBadge();
            }
        });
        return;
    }

    const cartSection = el('section', 'border-top pt-4 mt-4');
    cartSection.id = 'food-cart';
    cartSection.setAttribute('aria-labelledby', 'food-cart-title');
    const cartTitle = el('h3', 'h3 fw-bold mb-3', 'Твой заказ еды');
    cartTitle.id = 'food-cart-title';
    const cartRows = el('div', 'vstack gap-3 mb-3');
    cartRows.id = 'food-cart-items';
    const cartTotal = el('p', 'fw-bold fs-5');
    cartTotal.id = 'food-cart-total';
    cartTotal.setAttribute('aria-live', 'polite');
    const clear = el('button', 'btn btn-outline-danger mb-3', 'Очистить корзину');
    clear.id = 'food-cart-clear';
    clear.type = 'button';
    const feedback = el('p', 'small mb-3');
    feedback.id = 'food-feedback';
    feedback.setAttribute('role', 'status');
    const orderSuccess = el('div', 'alert hidden mt-3 text-break');
    orderSuccess.id = 'food-order-success';
    orderSuccess.setAttribute('role', 'status');
    orderSuccess.setAttribute('aria-live', 'polite');
    cartSection.append(cartTitle, el('p', 'small text-body-secondary', 'Учебный заказ: меню и цены демонстрационные. Оплаты, отправки на сервер и реального заказа нет.'), cartRows, cartTotal, clear, feedback);
    resultContainer.append(cartSection);

    const orderForm = el('form', 'border rounded-3 p-3');
    orderForm.id = 'food-order-form';
    orderForm.noValidate = true;
    orderForm.append(el('h4', 'h4 mb-3', 'Получение заказа'));
    const fields = el('div', 'row g-3');
    function inputField(id, labelText, type, autocomplete) {
        const column = el('div', 'col-12 col-md-6');
        const label = el('label', 'form-label fw-semibold', labelText);
        label.htmlFor = id;
        const field = el('input', 'form-control');
        field.id = id;
        field.type = type;
        field.name = id;
        field.required = true;
        field.autocomplete = autocomplete;
        field.maxLength = type === 'email' ? 254 : type === 'tel' ? 30 : 80;
        column.append(label, field);
        fields.append(column);
        return field;
    }
    const name = inputField('food-name', 'Имя', 'text', 'name');
    const email = inputField('food-email', 'Электронная почта', 'email', 'email');
    const phone = inputField('food-phone', 'Телефон (+7 и 10 цифр)', 'tel', 'tel');
    const deliveryColumn = el('div', 'col-12 col-md-6');
    const deliveryLabel = el('label', 'form-label fw-semibold', 'Способ получения');
    deliveryLabel.htmlFor = 'food-delivery';
    const delivery = el('select', 'form-select');
    delivery.id = 'food-delivery';
    delivery.required = true;
    [['', 'Выберите способ'], ['bar', 'Заберу у стойки'], ['seat', 'К игровому месту']].forEach(([value, text]) => {
        const option = el('option', '', text);
        option.value = value;
        delivery.append(option);
    });
    deliveryColumn.append(deliveryLabel, delivery);
    fields.append(deliveryColumn);
    const seatColumn = el('div', 'col-12 col-md-6 hidden');
    const seatLabel = el('label', 'form-label fw-semibold', 'Номер ПК');
    seatLabel.htmlFor = 'food-seat';
    const seat = el('select', 'form-select');
    seat.id = 'food-seat';
    const noSeat = el('option', '', 'Выберите ПК');
    noSeat.value = '';
    seat.append(noSeat);
    seats.forEach(item => {
        const option = el('option', '', `ПК ${String(item.id).padStart(2, '0')} · ${item.zone.toUpperCase()}`);
        option.value = item.id;
        seat.append(option);
    });
    seatColumn.append(seatLabel, seat);
    fields.append(seatColumn);
    const agreementRow = el('div', 'form-check my-3');
    const agreement = el('input', 'form-check-input');
    agreement.id = 'food-agreement';
    agreement.type = 'checkbox';
    agreement.required = true;
    const agreementLabel = el('label', 'form-check-label', 'Проверил состав и понимаю, что это демонстрационный заказ');
    agreementLabel.htmlFor = agreement.id;
    agreementRow.append(agreement, agreementLabel);
    const checkout = el('button', 'btn btn-danger', 'Сформировать демо-заказ');
    checkout.id = 'food-checkout';
    checkout.type = 'submit';
    const formStatus = el('p', 'small mt-3 mb-0');
    formStatus.id = 'food-order-status';
    formStatus.setAttribute('aria-live', 'polite');
    orderForm.append(fields, agreementRow, checkout, formStatus);
    cartSection.append(orderForm, orderSuccess);

    const menuSection = el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
    menuSection.id = 'food-menu';
    menuSection.setAttribute('aria-labelledby', 'food-menu-title');
    const menuTitle = el('h2', 'h2 fw-bold mb-3', 'Перекус без паузы в игре');
    menuTitle.id = 'food-menu-title';
    menuSection.append(el('p', 'small text-uppercase text-danger fw-semibold mb-2', 'Еда и напитки'), menuTitle, el('p', 'mb-4', 'Соберите корзину, выберите получение у стойки или номер ПК и проверьте итог. Это пример меню для учебного проекта; ассортимент, состав и цены клуба не подтверждены.'));
    const controls = el('div', 'row g-3 mb-3');
    function control(id, title, type) {
        const column = el('div', 'col-12 col-md-4');
        const label = el('label', 'form-label fw-semibold', title);
        label.htmlFor = id;
        const field = el(type, type === 'input' ? 'form-control' : 'form-select');
        field.id = id;
        column.append(label, field);
        controls.append(column);
        return field;
    }
    const search = control('food-search', 'Найти в меню', 'input');
    search.type = 'search';
    search.placeholder = 'Например, бургер или чай';
    search.maxLength = 80;
    const category = control('food-category', 'Категория', 'select');
    [['all', 'Всё меню'], ...Object.entries(categoryNames)].forEach(([value, title]) => {
        const option = el('option', '', title);
        option.value = value;
        category.append(option);
    });
    const sort = control('food-sort', 'Порядок', 'select');
    [['default', 'По меню'], ['price-asc', 'Сначала дешевле'], ['price-desc', 'Сначала дороже'], ['name', 'По названию']].forEach(([value, title]) => {
        const option = el('option', '', title);
        option.value = value;
        sort.append(option);
    });
    const optionsRow = el('div', 'd-flex flex-wrap align-items-center gap-3 mb-3');
    const availabilityRow = el('div', 'form-check');
    const available = el('input', 'form-check-input');
    available.type = 'checkbox';
    available.id = 'food-available';
    const availableLabel = el('label', 'form-check-label', 'Только доступные в демо');
    availableLabel.htmlFor = available.id;
    availabilityRow.append(available, availableLabel);
    const reset = el('button', 'btn btn-outline-secondary btn-sm', 'Сбросить фильтры');
    reset.id = 'food-reset';
    reset.type = 'button';
    const goCart = el('a', 'btn btn-outline-danger btn-sm', 'Перейти к корзине');
    goCart.href = '#food-cart';
    optionsRow.append(availabilityRow, reset, goCart);
    const count = el('p', 'small text-body-secondary mb-3');
    count.id = 'food-count';
    count.setAttribute('role', 'status');
    const menuCards = el('div', 'row g-3');
    menuCards.id = 'food-cards';
    menuSection.append(controls, optionsRow, count, menuCards);
    document.getElementById('booking-content').insertBefore(menuSection, document.getElementById('direct-contact'));

    function renderProduct(item) {
        const column = el('div', 'col-12 col-md-6 col-lg-4');
        const article = el('article', 'card h-100 shadow-sm');
        article.dataset.foodId = item.id;
        const photo = el('img', `card-img-top w-100 bg-white ${item.category === 'food' || item.id === 'cookie' ? 'object-fit-cover' : 'object-fit-contain'}`);
        photo.src = item.image;
        photo.alt = item.imageAlt;
        photo.height = 190;
        photo.loading = 'lazy';
        photo.decoding = 'async';
        const body = el('div', 'card-body d-flex flex-column');
        const top = el('div', 'd-flex justify-content-between align-items-center gap-2 mb-3');
        top.append(el('span', 'badge text-bg-dark', categoryNames[item.category]), el('span', 'small text-body-secondary', item.portion));
        body.append(top, el('h3', 'h4 card-title', item.name), el('p', 'card-text mb-2', item.description), el('p', 'small text-body-secondary mb-3', `Аллергены: ${item.allergens}`), el('p', 'fw-bold fs-5 text-danger mt-auto', money(item.price)));
        const add = el('button', 'btn btn-outline-danger w-100', item.available ? 'Добавить в корзину' : 'Недоступно в демо');
        add.type = 'button';
        add.dataset.addFood = item.id;
        add.disabled = !item.available;
        add.setAttribute('aria-label', `${item.available ? 'Добавить в корзину' : 'Недоступно'}: ${item.name}`);
        body.append(add);
        article.append(photo, body);
        column.append(article);
        return column;
    }

    function renderMenu() {
        const matches = window.TopGameLogic.filterMenu(menu, search.value, category.value, available.checked);
        if (sort.value === 'price-asc') matches.sort((a, b) => a.price - b.price);
        else if (sort.value === 'price-desc') matches.sort((a, b) => b.price - a.price);
        else if (sort.value === 'name') matches.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        count.textContent = `Найдено: ${matches.length} из ${menu.length}.`;
        renderList(menuCards, matches, renderProduct, 'Ничего не найдено. Измените запрос или сбросьте фильтры.');
    }

    function renderCartLine(line) {
        const item = menu.find(product => product.id === line.id);
        const article = el('article', 'bg-white border rounded-3 p-3');
        article.append(el('h4', 'h6 fw-bold mb-2', item.name), el('p', 'small mb-2', `${money(item.price)} × ${line.quantity} = ${money(item.price * line.quantity)}`));
        const actions = el('div', 'd-flex flex-wrap align-items-center gap-2');
        [['decrease', '−', `Уменьшить количество: ${item.name}`], ['increase', '+', `Увеличить количество: ${item.name}`], ['remove', 'Удалить', `Удалить: ${item.name}`]].forEach(([action, text, label]) => {
            const button = el('button', action === 'remove' ? 'btn btn-outline-secondary' : 'btn btn-outline-secondary btn-lg', text);
            button.type = 'button';
            button.dataset.cartAction = action;
            button.dataset.itemId = item.id;
            button.setAttribute('aria-label', label);
            if (action === 'increase') button.disabled = line.quantity >= maxQuantity;
            actions.append(button);
        });
        actions.insertBefore(el('span', 'small fw-semibold', `${line.quantity} шт.`), actions.children[1]);
        article.append(actions);
        return article;
    }

    function renderCart() {
        const totals = cartTotals(cart);
        renderList(cartRows, cart, renderCartLine, 'Корзина пустая. Добавьте еду или напиток из меню.');
        cartTotal.textContent = `Товаров: ${totals.quantity} · Итого: ${money(totals.total)}`;
        clear.disabled = cart.length === 0;
        checkout.disabled = cart.length === 0;
        updateBadge();
        updateOrderSummary();
    }

    function updateOrderSummary() {
        const location = delivery.value === 'seat' ? (seat.value ? `к ПК ${seat.value}` : 'выберите ПК') : delivery.value === 'bar' ? 'у стойки' : 'выберите получение';
        formStatus.textContent = `${cartTotals(cart).quantity} шт., ${money(cartTotals(cart).total)} · ${location}. Максимум ${maxQuantity} шт. каждого товара.`;
    }

    function saveCart(message) {
        const saved = store.set('cart', cart);
        renderCart();
        notify(feedback, saved ? message : `${message} Сохранение недоступно; корзина работает до закрытия страницы.`, '');
        notify(orderSuccess, '', '');
    }

    menuCards.addEventListener('click', event => {
        const button = event.target.closest('[data-add-food]');
        if (!button) return;
        const item = menu.find(product => product.id === button.dataset.addFood && product.available);
        if (!item) return;
        const line = cart.find(entry => entry.id === item.id);
        if (line && line.quantity >= maxQuantity) {
            notify(feedback, `В корзине уже ${maxQuantity} шт. «${item.name}».`, 'error');
            return;
        }
        if (line) line.quantity += 1;
        else cart.push({ id: item.id, quantity: 1 });
        saveCart(`Добавлено: ${item.name}. В корзине ${cartTotals(cart).quantity} шт.`);
        renderMenu();
        count.textContent += ` Добавлено: ${item.name}. В корзине ${cartTotals(cart).quantity} шт.`;
        menuCards.querySelector(`[data-add-food="${item.id}"]`).focus();
    });
    cartRows.addEventListener('click', event => {
        const button = event.target.closest('[data-cart-action]');
        if (!button) return;
        const line = cart.find(entry => entry.id === button.dataset.itemId);
        if (!line) return;
        const action = button.dataset.cartAction;
        if (action === 'increase' && line.quantity < maxQuantity) line.quantity += 1;
        else if (action === 'decrease') line.quantity -= 1;
        else if (action === 'remove') line.quantity = 0;
        cart = cart.filter(entry => entry.quantity > 0);
        saveCart('Корзина обновлена.');
        const replacement = cartRows.querySelector(`[data-item-id="${button.dataset.itemId}"][data-cart-action="${action}"]`);
        if (replacement && !replacement.disabled) replacement.focus();
        else if (!clear.disabled) clear.focus();
        else search.focus();
    });
    clear.addEventListener('click', () => {
        cart = [];
        clearErrors(orderForm);
        saveCart('Корзина очищена.');
        search.focus();
    });
    search.addEventListener('input', renderMenu);
    [category, sort, available].forEach(field => field.addEventListener('change', renderMenu));
    reset.addEventListener('click', () => {
        search.value = '';
        category.value = 'all';
        sort.value = 'default';
        available.checked = false;
        renderMenu();
        count.textContent += ' Фильтры сброшены.';
        search.focus();
    });
    delivery.addEventListener('change', () => {
        const toSeat = delivery.value === 'seat';
        seatColumn.classList.toggle('hidden', !toSeat);
        seat.disabled = !toSeat;
        seat.required = toSeat;
        if (!toSeat) { seat.value = ''; setError(seat, ''); }
    });
    orderForm.addEventListener('input', event => {
        if (event.target.id) setError(event.target, '');
        notify(orderSuccess, '', '');
        updateOrderSummary();
    });
    orderForm.addEventListener('change', event => {
        if (event.target.id) setError(event.target, '');
        notify(orderSuccess, '', '');
        updateOrderSummary();
    });
    orderForm.addEventListener('submit', event => {
        event.preventDefault();
        clearErrors(orderForm);
        if (cart.length === 0) { notify(feedback, 'Добавьте хотя бы один товар.', 'error'); return; }
        const contacts = validateContacts(name.value, email.value, phone.value);
        const errors = [
            [name, contacts.name], [email, contacts.email], [phone, contacts.phone],
            [delivery, ['bar', 'seat'].includes(delivery.value) ? '' : 'Выберите способ получения.'],
            [seat, delivery.value === 'seat' && !seats.some(item => String(item.id) === seat.value) ? 'Для доставки к месту выберите действующий номер ПК.' : ''],
            [agreement, agreement.checked ? '' : 'Подтвердите, что проверили состав и понимаете демонстрационный режим.']
        ];
        const invalid = errors.filter(([field, message]) => setError(field, message));
        if (invalid.length > 0) {
            notify(feedback, `Исправьте поля: ${invalid.length}.`, 'error');
            invalid[0][0].focus();
            return;
        }
        const totals = cartTotals(cart);
        const items = cart.map(line => `${menu.find(item => item.id === line.id).name} × ${line.quantity}`).join('; ');
        const destination = delivery.value === 'seat' ? `к ПК ${seat.value}` : 'у стойки';
        const orderRef = reference('FOOD');
        const summary = `${orderRef}. ${name.value.trim()}, получение ${destination}. ${items}. Всего ${totals.quantity} шт., ${money(totals.total)}. Контакты: ${email.value.trim()}, ${phone.value.trim()}. Это демонстрация: данные не отправлены на сервер, реальный заказ и платёж не созданы.`;
        cart = [];
        store.set('cart', cart);
        renderCart();
        orderForm.reset();
        seatColumn.classList.add('hidden');
        seat.disabled = true;
        seat.required = false;
        updateOrderSummary();
        notify(feedback, 'Демонстрационный итог сформирован. Корзина очищена.', 'success');
        notify(orderSuccess, summary, 'success');
        orderSuccess.tabIndex = -1;
        orderSuccess.focus();
    });
    window.addEventListener('storage', event => {
        if (event.key === 'topgame-cart') {
            cart = readCart();
            renderCart();
            notify(feedback, 'Корзина обновлена в другой вкладке.', '');
            notify(orderSuccess, '', '');
        }
    });
    seat.disabled = true;
    renderMenu();
    renderCart();
})();
