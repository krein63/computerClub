'use strict';

function setupFood() {
    const app = window.TopGame;
    const menu = app.menu;
    const maxQuantity = 20;
    const categoryNames = { food: 'Еда', snacks: 'Снеки', drinks: 'Напитки' };
    const cartLink = document.getElementById('nav-cart');
    const search = document.getElementById('food-search');
    const category = document.getElementById('food-category');
    const sort = document.getElementById('food-sort');
    const count = document.getElementById('food-count');
    const menuCards = document.getElementById('food-cards');
    const categoryButtons = document.querySelectorAll('[data-food-category]');
    let cart = readCart();
    let selectedCategory = 'all';
    let changeCallback = null;

    if (category) selectedCategory = category.value;

    // Восстанавливаем только доступные товары и правильное количество.
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
                restored.push({ id: product.id, quantity: Math.min(maxQuantity, line.quantity) });
            }
        }
        return restored;
    }

    // Возвращаем копию, чтобы другой файл случайно не изменил корзину.
    function getCart() {
        const copy = [];
        for (const line of cart) {
            copy.push({ id: line.id, quantity: line.quantity });
        }
        return copy;
    }

    function getTotal() {
        return app.cartTotals(cart, menu).total;
    }

    function updateBadge() {
        if (!cartLink) return;
        const totals = app.cartTotals(cart, menu);
        cartLink.href = 'booking.html#food-cart';
        let count = totals.quantity;
        const draft = app.store.get('visit-draft', null);
        if (draft && typeof draft.date === 'string' && typeof draft.time === 'string' && Array.isArray(draft.seats)) {
            const start = app.localDateTime(draft.date, draft.time);
            if (Number.isFinite(start) && start > Date.now()) {
                const counted = [];
                for (const id of draft.seats) {
                    if (app.findProduct(app.seats, id) && !counted.includes(id)) counted.push(id);
                }
                count += counted.length;
            }
        }
        cartLink.textContent = 'Корзина · ' + count;
    }

    // После изменения обновляем карточки и общую корзину бронирования.
    function updateCart() {
        app.store.set('cart', cart);
        renderMenu();
        updateBadge();
        if (changeCallback) changeCallback();
    }

    function changeQuantity(id, delta) {
        const product = app.findProduct(menu, id);
        if (!product || !product.available || !Number.isInteger(delta) || delta === 0) return false;
        const line = app.findProduct(cart, id);
        if (!line) {
            if (delta < 1) return false;
            cart.push({ id: id, quantity: Math.min(maxQuantity, delta) });
        } else {
            const quantity = Math.min(maxQuantity, line.quantity + delta);
            if (quantity === line.quantity) return false;
            if (quantity < 1) {
                cart.splice(cart.indexOf(line), 1);
            } else {
                line.quantity = quantity;
            }
        }
        updateCart();
        return true;
    }

    function removeItem(id) {
        const line = app.findProduct(cart, id);
        if (!line) return false;
        cart.splice(cart.indexOf(line), 1);
        updateCart();
        return true;
    }

    function clearCart() {
        cart = [];
        updateCart();
    }

    function onChange(callback) {
        changeCallback = callback;
    }

    // Эти функции доступны и на страницах без меню.
    window.TopGameFood = {
        getCart: getCart,
        getTotal: getTotal,
        changeQuantity: changeQuantity,
        removeItem: removeItem,
        clear: clearCart,
        onChange: onChange
    };

    function quantityButton(item, action, text, label) {
        const button = app.el('button', 'quantity-button', text);
        button.type = 'button';
        button.dataset.foodAction = action;
        button.dataset.foodId = item.id;
        button.setAttribute('aria-label', label + ': ' + item.name);
        return button;
    }

    // Вся подпись товара задаётся через textContent внутри app.el.
    function renderProduct(item) {
        const article = app.el('article', 'menu-item');
        article.dataset.foodId = item.id;
        const photo = app.el('img', 'menu-photo');
        photo.src = item.image;
        photo.alt = item.imageAlt;
        photo.loading = 'lazy';
        photo.decoding = 'async';
        photo.width = 400;
        photo.height = 240;
        const copy = app.el('div', 'menu-copy');
        copy.append(app.el('p', 'menu-category', categoryNames[item.category] + ' · ' + item.portion));
        copy.append(app.el('h3', 'menu-name', item.name));
        copy.append(app.el('p', 'menu-description', item.description));
        const details = app.el('details', 'menu-details');
        details.append(app.el('summary', '', 'Состав и аллергены'));
        details.append(app.el('p', 'menu-allergens', item.allergens));
        copy.append(details);
        const bottom = app.el('div', 'menu-bottom');
        bottom.append(app.el('strong', 'menu-price', app.money(item.price)));
        const line = app.findProduct(cart, item.id);
        if (line) {
            const control = app.el('div', 'quantity-control');
            const decrease = quantityButton(item, 'decrease', '−', 'Уменьшить количество');
            const increase = quantityButton(item, 'increase', '+', 'Увеличить количество');
            increase.disabled = line.quantity >= maxQuantity;
            if (increase.disabled) increase.title = 'Максимум 20 штук';
            control.append(decrease, app.el('span', 'quantity-value', String(line.quantity)), increase);
            bottom.append(control);
        } else {
            const add = app.el('button', 'add-food-button', '+ Добавить');
            add.type = 'button';
            add.dataset.addFood = item.id;
            add.setAttribute('aria-label', 'Добавить в корзину: ' + item.name);
            if (!item.available) {
                add.disabled = true;
                add.textContent = 'Нет в наличии';
                add.setAttribute('aria-label', 'Нет в наличии: ' + item.name);
                article.classList.add('is-unavailable');
            }
            bottom.append(add);
        }
        copy.append(bottom);
        article.append(photo, copy);
        return article;
    }

    function compareProducts(a, b) {
        if (sort && sort.value === 'price-asc') return a.price - b.price;
        if (sort && sort.value === 'price-desc') return b.price - a.price;
        if (sort && sort.value === 'name') return a.name.localeCompare(b.name, 'ru');
        return 0;
    }

    function updateCategories() {
        if (category) category.value = selectedCategory;
        for (const button of categoryButtons) {
            const active = button.dataset.foodCategory === selectedCategory;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        }
    }

    function renderMenu() {
        if (!menuCards) return;
        let query = '';
        if (search) query = search.value;
        const matches = app.filterMenu(menu, query, selectedCategory, false);
        matches.sort(compareProducts);
        app.renderList(menuCards, matches, renderProduct, 'Ничего не найдено. Попробуйте другое название или категорию.');
        if (count) count.textContent = 'В меню: ' + matches.length + ' из ' + menu.length;
        updateCategories();
    }

    function changeCategory(event) {
        selectedCategory = event.currentTarget.dataset.foodCategory;
        renderMenu();
    }

    function selectCategory() {
        selectedCategory = category.value;
        renderMenu();
    }

    function changeMenuQuantity(event) {
        const button = event.target.closest('button');
        if (!button || !menuCards.contains(button) || button.disabled) return;
        let id = button.dataset.addFood;
        let action = 'increase';
        if (!id) {
            id = button.dataset.foodId;
            action = button.dataset.foodAction;
        }
        if (!id || !action) return;
        let delta = 1;
        if (action === 'decrease') delta = -1;
        const keepFocus = document.activeElement === button;
        if (!changeQuantity(id, delta)) return;

        // Возвращаем фокус только после кнопки внутри карточки.
        // Поиск, фильтры и поля бронирования при этом не затрагиваются.
        if (keepFocus) {
            const cards = menuCards.querySelectorAll('[data-food-id]');
            for (const card of cards) {
                if (card.tagName !== 'ARTICLE' || card.dataset.foodId !== id) continue;
                let nextButton = card.querySelector('[data-food-action="' + action + '"]');
                if (!nextButton || nextButton.disabled) nextButton = card.querySelector('button:not(:disabled)');
                if (nextButton) nextButton.focus({ preventScroll: true });
            }
        }
    }

    function syncCart(event) {
        if (event.key === 'topgame-visit-draft') { updateBadge(); return; }
        if (event.key !== 'topgame-cart' && event.key !== null) return;
        cart = readCart();
        renderMenu();
        updateBadge();
        if (changeCallback) changeCallback();
    }

    window.addEventListener('storage', syncCart);
    if (menuCards) menuCards.addEventListener('click', changeMenuQuantity);
    if (search) search.addEventListener('input', renderMenu);
    if (category) category.addEventListener('change', selectCategory);
    if (sort) sort.addEventListener('change', renderMenu);
    for (const button of categoryButtons) {
        button.addEventListener('click', changeCategory);
    }
    renderMenu();
    updateBadge();
}

setupFood();
