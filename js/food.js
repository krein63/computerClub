'use strict';

function setupFood() {
    const app = window.TopGame;
    const menu = app.menu;
    const maxQuantity = 20;
    const categoryNames = { food: 'Еда', snacks: 'Снеки', drinks: 'Напитки' };
    let cart = readCart();

    // Ссылка на корзину нужна на каждой странице.
    const cartLink = document.getElementById('nav-cart');
    updateBadge();
    window.addEventListener('storage', syncCart);

    const resultContainer = document.getElementById('booking-result');
    if (!resultContainer) return;

    // Находим элементы, с которыми дальше работает JavaScript.
    const cartRows = document.getElementById('food-cart-items');
    const cartTotal = document.getElementById('food-cart-total');
    const clearButton = document.getElementById('food-cart-clear');
    const feedback = document.getElementById('food-feedback');
    const orderForm = document.getElementById('food-order-form');
    const name = document.getElementById('food-name');
    const email = document.getElementById('food-email');
    const phone = document.getElementById('food-phone');
    const delivery = document.getElementById('food-delivery');
    const seatColumn = document.getElementById('food-seat-column');
    const seat = document.getElementById('food-seat');
    const agreement = document.getElementById('food-agreement');
    const checkout = document.getElementById('food-checkout');
    const formStatus = document.getElementById('food-order-status');
    const orderSuccess = document.getElementById('food-order-success');
    const search = document.getElementById('food-search');
    const category = document.getElementById('food-category');
    const sort = document.getElementById('food-sort');
    const available = document.getElementById('food-available');
    const resetButton = document.getElementById('food-reset');
    const count = document.getElementById('food-count');
    const menuCards = document.getElementById('food-cards');

    for (const computer of app.seats) {
        const option = app.el('option');
        option.value = computer.id;
        option.textContent = `ПК ${String(computer.id).padStart(2, '0')} · ${computer.zone.toUpperCase()}`;
        seat.append(option);
    }

    // Восстанавливаем корзину: пропускаем неверные данные и объединяем повторы.
    function readCart() {
        const stored = app.store.get('cart', []);
        const restored = [];
        if (!Array.isArray(stored)) return restored;
        for (const line of stored) {
            if (!line) continue;
            const product = app.findProduct(menu, line.id);
            if (!product || !product.available) continue;
            if (!Number.isInteger(line.quantity) || line.quantity < 1) continue;
            const existing = app.findProduct(restored, line.id);
            if (existing) {
                existing.quantity = Math.min(maxQuantity, existing.quantity + line.quantity);
            } else {
                restored.push({ id: line.id, quantity: Math.min(maxQuantity, line.quantity) });
            }
        }
        return restored;
    }

    function updateBadge() {
        const totals = app.cartTotals(cart, menu);
        cartLink.textContent = `Корзина · ${totals.quantity}`;
    }

    function syncCart(event) {
        if (event.key !== 'topgame-cart') return;
        cart = readCart();
        if (!resultContainer) {
            updateBadge();
            return;
        }
        renderCart();
        app.notify(feedback, 'Корзина обновлена в другой вкладке.', '');
        app.notify(orderSuccess, '', '');
    }

    // Карточка одного товара. app.el задаёт текст безопасно через textContent.
    function renderProduct(item) {
        const column = app.el('div', 'col-12 col-md-6 col-lg-4');
        const article = app.el('article', 'card h-100 shadow-sm bg-dark text-light');
        article.dataset.foodId = item.id;
        const photo = app.el('img', 'card-img-top w-100 bg-dark object-fit-cover');
        photo.src = item.image;
        photo.alt = item.imageAlt;
        photo.height = 190;
        photo.loading = 'lazy';
        photo.decoding = 'async';
        const body = app.el('div', 'card-body d-flex flex-column');
        const top = app.el('div', 'd-flex justify-content-between align-items-center gap-2 mb-3');
        top.append(app.el('span', 'badge text-bg-dark', categoryNames[item.category]));
        top.append(app.el('span', 'small text-body-secondary', item.portion));
        body.append(top);
        body.append(app.el('h3', 'h4 card-title', item.name));
        body.append(app.el('p', 'card-text mb-2', item.description));
        body.append(app.el('p', 'small text-body-secondary mb-3', `Аллергены: ${item.allergens}`));
        body.append(app.el('p', 'fw-bold fs-5 text-danger-emphasis mt-auto', app.money(item.price)));
        const add = app.el('button', 'btn btn-outline-danger w-100 text-light', 'Добавить в корзину');
        add.type = 'button';
        add.dataset.addFood = item.id;
        add.setAttribute('aria-label', `Добавить в корзину: ${item.name}`);
        if (!item.available) {
            add.disabled = true;
            add.textContent = 'Недоступно в демо';
            add.setAttribute('aria-label', `Недоступно: ${item.name}`);
        }
        body.append(add);
        article.append(photo, body);
        column.append(article);
        return column;
    }

    function compareProducts(a, b) {
        if (sort.value === 'price-asc') return a.price - b.price;
        if (sort.value === 'price-desc') return b.price - a.price;
        if (sort.value === 'name') return a.name.localeCompare(b.name, 'ru');
        return 0;
    }

    function renderMenu() {
        const matches = app.filterMenu(menu, search.value, category.value, available.checked);
        matches.sort(compareProducts);
        count.textContent = `Найдено: ${matches.length} из ${menu.length}.`;
        app.renderList(menuCards, matches, renderProduct, 'Ничего не найдено. Измените запрос или сбросьте фильтры.');
    }

    // У каждой строки корзины есть три действия: уменьшить, увеличить и удалить.
    function cartButton(item, action, text, label) {
        let classes = 'btn btn-outline-light btn-lg';
        if (action === 'remove') classes = 'btn btn-outline-light';
        const button = app.el('button', classes, text);
        button.type = 'button';
        button.dataset.cartAction = action;
        button.dataset.itemId = item.id;
        button.setAttribute('aria-label', `${label}: ${item.name}`);
        return button;
    }

    function renderCartLine(line) {
        const item = app.findProduct(menu, line.id);
        const article = app.el('article', 'bg-body-secondary border rounded-3 p-3');
        article.append(app.el('h4', 'h6 fw-bold mb-2', item.name));
        article.append(app.el('p', 'small mb-2', `${app.money(item.price)} × ${line.quantity} = ${app.money(item.price * line.quantity)}`));
        const actions = app.el('div', 'd-flex flex-wrap align-items-center gap-2');
        const decrease = cartButton(item, 'decrease', '−', 'Уменьшить количество');
        const increase = cartButton(item, 'increase', '+', 'Увеличить количество');
        const remove = cartButton(item, 'remove', 'Удалить', 'Удалить');
        increase.disabled = line.quantity >= maxQuantity;
        actions.append(decrease, app.el('span', 'small fw-semibold', `${line.quantity} шт.`), increase, remove);
        article.append(actions);
        return article;
    }

    function renderCart() {
        const totals = app.cartTotals(cart, menu);
        app.renderList(cartRows, cart, renderCartLine, 'Корзина пустая. Добавьте еду или напиток из меню.');
        cartTotal.textContent = `Товаров: ${totals.quantity} · Итого: ${app.money(totals.total)}`;
        clearButton.disabled = cart.length === 0;
        checkout.disabled = cart.length === 0;
        updateBadge();
        updateOrderSummary();
    }

    function orderDestination() {
        if (delivery.value === 'bar') return 'у стойки';
        if (delivery.value === 'seat') {
            if (seat.value) return `к ПК ${seat.value}`;
            return 'выберите ПК';
        }
        return 'выберите получение';
    }

    function updateOrderSummary() {
        const totals = app.cartTotals(cart, menu);
        formStatus.textContent = `${totals.quantity} шт., ${app.money(totals.total)} · ${orderDestination()}. Максимум ${maxQuantity} шт. каждого товара.`;
    }

    function saveCart(message) {
        const saved = app.store.set('cart', cart);
        if (!saved) message += ' Сохранение недоступно; корзина работает до закрытия страницы.';
        renderCart();
        app.notify(feedback, message, '');
        app.notify(orderSuccess, '', '');
    }

    function addToCart(event) {
        const button = event.target.closest('[data-add-food]');
        if (!button) return;
        const item = app.findProduct(menu, button.dataset.addFood);
        if (!item || !item.available) return;
        const line = app.findProduct(cart, item.id);
        if (line && line.quantity >= maxQuantity) {
            app.notify(feedback, `В корзине уже ${maxQuantity} шт. «${item.name}».`, 'error');
            return;
        }
        if (line) {
            line.quantity += 1;
        } else {
            cart.push({ id: item.id, quantity: 1 });
        }
        const message = `Добавлено: ${item.name}. В корзине ${app.cartTotals(cart, menu).quantity} шт.`;
        saveCart(message);
        renderMenu();
        count.textContent += ' ' + message;
        menuCards.querySelector(`[data-add-food="${item.id}"]`).focus();
    }

    function changeCart(event) {
        const button = event.target.closest('[data-cart-action]');
        if (!button) return;
        const line = app.findProduct(cart, button.dataset.itemId);
        if (!line) return;
        const action = button.dataset.cartAction;
        if (action === 'increase' && line.quantity < maxQuantity) line.quantity += 1;
        if (action === 'decrease') line.quantity -= 1;
        if (action === 'remove') line.quantity = 0;
        if (line.quantity === 0) cart.splice(cart.indexOf(line), 1);
        saveCart('Корзина обновлена.');

        // После перерисовки возвращаем фокус на кнопку или на поиск.
        const replacement = cartRows.querySelector(`[data-item-id="${line.id}"][data-cart-action="${action}"]`);
        if (replacement && !replacement.disabled) {
            replacement.focus();
        } else if (!clearButton.disabled) {
            clearButton.focus();
        } else {
            search.focus();
        }
    }

    function clearCart() {
        cart = [];
        app.clearErrors(orderForm);
        saveCart('Корзина очищена.');
        search.focus();
    }

    function resetFilters() {
        search.value = '';
        category.value = 'all';
        sort.value = 'default';
        available.checked = false;
        renderMenu();
        count.textContent += ' Фильтры сброшены.';
        search.focus();
    }

    function changeDelivery() {
        const toSeat = delivery.value === 'seat';
        seatColumn.classList.toggle('hidden', !toSeat);
        seat.disabled = !toSeat;
        seat.required = toSeat;
        if (!toSeat) {
            seat.value = '';
            app.setError(seat, '');
        }
    }

    function editOrder(event) {
        if (event.target.id) app.setError(event.target, '');
        app.notify(orderSuccess, '', '');
        updateOrderSummary();
    }

    // Собираем ошибки и переводим фокус на первое неверное поле.
    function validateOrder() {
        const contacts = app.validateContacts(name.value, email.value, phone.value);
        const errors = [
            { field: name, message: contacts.name },
            { field: email, message: contacts.email },
            { field: phone, message: contacts.phone }
        ];
        if (delivery.value !== 'bar' && delivery.value !== 'seat') {
            errors.push({ field: delivery, message: 'Выберите способ получения.' });
        }
        let validSeat = false;
        for (const computer of app.seats) {
            if (String(computer.id) === seat.value) validSeat = true;
        }
        if (delivery.value === 'seat' && !validSeat) {
            errors.push({ field: seat, message: 'Для доставки к месту выберите действующий номер ПК.' });
        }
        if (!agreement.checked) {
            errors.push({ field: agreement, message: 'Подтвердите, что проверили состав и понимаете демонстрационный режим.' });
        }
        let firstInvalid = null;
        let errorCount = 0;
        for (const error of errors) {
            if (app.setError(error.field, error.message)) {
                errorCount += 1;
                if (!firstInvalid) firstInvalid = error.field;
            }
        }
        if (firstInvalid) {
            app.notify(feedback, `Исправьте поля: ${errorCount}.`, 'error');
            firstInvalid.focus();
            return false;
        }
        return true;
    }

    function submitOrder(event) {
        event.preventDefault();
        app.clearErrors(orderForm);
        if (cart.length === 0) {
            app.notify(feedback, 'Добавьте хотя бы один товар.', 'error');
            return;
        }
        if (!validateOrder()) return;
        const totals = app.cartTotals(cart, menu);
        const items = [];
        for (const line of cart) {
            const item = app.findProduct(menu, line.id);
            items.push(`${item.name} × ${line.quantity}`);
        }
        const summary = `${app.reference('FOOD')}. ${name.value.trim()}, получение ${orderDestination()}. ${items.join('; ')}. Всего ${totals.quantity} шт., ${app.money(totals.total)}. Контакты: ${email.value.trim()}, ${phone.value.trim()}. Это демонстрация: данные не отправлены на сервер, реальный заказ и платёж не созданы.`;
        cart = [];
        app.store.set('cart', cart);
        renderCart();
        orderForm.reset();
        changeDelivery();
        updateOrderSummary();
        app.notify(feedback, 'Демонстрационный итог сформирован. Корзина очищена.', 'success');
        app.notify(orderSuccess, summary, 'success');
        orderSuccess.tabIndex = -1;
        orderSuccess.focus();
    }

    // Связываем действия пользователя с функциями.
    menuCards.addEventListener('click', addToCart);
    cartRows.addEventListener('click', changeCart);
    clearButton.addEventListener('click', clearCart);
    search.addEventListener('input', renderMenu);
    category.addEventListener('change', renderMenu);
    sort.addEventListener('change', renderMenu);
    available.addEventListener('change', renderMenu);
    resetButton.addEventListener('click', resetFilters);
    delivery.addEventListener('change', changeDelivery);
    orderForm.addEventListener('input', editOrder);
    orderForm.addEventListener('change', editOrder);
    orderForm.addEventListener('submit', submitOrder);
    renderMenu();
    renderCart();
}

setupFood();
