// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const {
    el,
    money,
    menu,
    store,
    renderList,
    notify
  } = window.TopGame;
  const categoryNames = {
    food: 'Еда',
    snacks: 'Снеки',
    drinks: 'Напитки'
  };
  const maxQuantity = 20;
  let cart = readCart();
  const nav = $('#main-navigation .navbar-nav').get(0);
  const cartLink = el('a', 'nav-link px-2');
  $(cartLink).attr("id", 'nav-cart');
  $(cartLink).attr({ href: 'booking.html#food-cart', 'aria-haspopup': 'dialog' });
  const navItem = el('li', 'nav-item');
  $(navItem).append(cartLink);
  if (nav) $(nav).append(navItem);
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
      if (existing) existing.quantity = Math.min(maxQuantity, existing.quantity + line.quantity);else restored.push({
        id: line.id,
        quantity: Math.min(maxQuantity, line.quantity)
      });
    }
    return restored;
  }
  function cartTotals(lines) {
    return window.TopGameLogic.cartTotals(lines, menu);
  }
  function updateBadge() {
    $(cartLink).text(`Корзина · ${cartTotals(cart).quantity}`);
  }
  updateBadge();
  const resultContainer = $('#food-cart').get(0);
  if (!resultContainer) {
    $(window).on('storage', event => {
      if (event.key === 'topgame-cart') {
        cart = readCart();
        updateBadge();
      }
    });
    return;
  }
  const cartSection = el('div', 'food-cart-content');
  const cartRows = el('div', 'vstack gap-3 mb-3');
  $(cartRows).attr("id", 'food-cart-items');
  const cartTotal = el('p', 'fw-bold fs-5');
  $(cartTotal).attr("id", 'food-cart-total');
  $(cartTotal).attr('aria-live', 'polite');
  const clear = el('button', 'btn btn-outline-danger mb-3', 'Очистить корзину');
  $(clear).attr("id", 'food-cart-clear');
  $(clear).attr("type", 'button');
  const feedback = el('p', 'small mb-3');
  $(feedback).attr("id", 'food-feedback');
  $(feedback).attr('role', 'status');
  $(cartSection).append(cartRows, cartTotal, clear, feedback);
  $(resultContainer).append(cartSection);
  const orderNote = el('aside', 'alert alert-light border mb-3');
  $(orderNote).attr('aria-labelledby', 'food-order-note-title');
  const orderNoteTitle = el('h3', 'h6 fw-bold mb-2', 'Получение заказа');
  $(orderNoteTitle).attr('id', 'food-order-note-title');
  $(orderNote).append(orderNoteTitle, el('p', 'mb-0', 'Назовите позиции администратору у стойки и оплатите заказ в клубе.'));
  $(cartSection).append(orderNote);
  const menuSection = el('section');
  $(menuSection).attr('aria-labelledby', 'food-menu-title');
  const menuTitle = el('h2', 'visually-hidden', 'Меню еды и напитков');
  $(menuTitle).attr("id", 'food-menu-title');
  $(menuSection).append(menuTitle);
  const controls = el('div', 'row g-3 mb-3');
  function control(id, title, type) {
    const column = el('div', 'col-12 col-md-4');
    const label = el('label', 'form-label fw-semibold', title);
    $(label).attr("for", id);
    const field = el(type, type === 'input' ? 'form-control' : 'form-select');
    $(field).attr("id", id);
    $(column).append(label, field);
    $(controls).append(column);
    return field;
  }
  const search = control('food-search', 'Найти в меню', 'input');
  $(search).attr("type", 'search');
  search.placeholder = 'Например, бургер или чай';
  $(search).attr("maxlength", 80);
  const category = control('food-category', 'Категория', 'select');
  [['all', 'Всё меню'], ...Object.entries(categoryNames)].forEach(([value, title]) => {
    const option = el('option', '', title);
    $(option).val(value);
    $(category).append(option);
  });
  const sort = control('food-sort', 'Порядок', 'select');
  [['default', 'По меню'], ['price-asc', 'Сначала дешевле'], ['price-desc', 'Сначала дороже'], ['name', 'По названию']].forEach(([value, title]) => {
    const option = el('option', '', title);
    $(option).val(value);
    $(sort).append(option);
  });
  const optionsRow = el('div', 'd-flex flex-wrap align-items-center gap-3 mb-3');
  const availabilityRow = el('div', 'form-check');
  const available = el('input', 'form-check-input');
  $(available).attr("type", 'checkbox');
  $(available).attr("id", 'food-available');
  const availableLabel = el('label', 'form-check-label', 'Только в наличии');
  $(availableLabel).attr("for", available.id);
  $(availabilityRow).append(available, availableLabel);
  const reset = el('button', 'btn btn-outline-secondary btn-sm', 'Сбросить фильтры');
  $(reset).attr("id", 'food-reset');
  $(reset).attr("type", 'button');
  const goCart = el('a', 'btn btn-outline-danger btn-sm', 'Открыть корзину');
  $(goCart).attr({ href: '#food-cart', 'aria-haspopup': 'dialog' });
  $(optionsRow).append(availabilityRow, reset, goCart);
  const count = el('p', 'small text-body-secondary mb-3');
  $(count).attr("id", 'food-count');
  $(count).attr('role', 'status');
  const menuCards = el('div', 'row g-3');
  $(menuCards).attr("id", 'food-cards');
  $(menuSection).append(controls, optionsRow, count, menuCards);
  $('#food-menu').append(menuSection);
  function renderProduct(item) {
    const column = el('div', 'col-12 col-md-6 col-lg-4');
    const article = el('article', 'card h-100 shadow-sm');
    $(article).attr("data-food-id", item.id);
    const photo = el('img', 'card-img-top w-100 bg-dark object-fit-cover');
    $(photo).attr("src", item.image);
    $(photo).attr("alt", item.imageAlt);
    $(photo).attr("height", 190);
    photo.loading = 'lazy';
    photo.decoding = 'async';
    const body = el('div', 'card-body d-flex flex-column');
    const top = el('div', 'd-flex justify-content-between align-items-center gap-2 mb-3');
    $(top).append(el('span', 'badge text-bg-dark', categoryNames[item.category]), el('span', 'small text-body-secondary', item.portion));
    $(body).append(top, el('h3', 'h4 card-title', item.name), el('p', 'card-text mb-2', item.description), el('p', 'small text-body-secondary mb-3', `Аллергены: ${item.allergens}`), el('p', 'fw-bold fs-5 text-danger mt-auto', money(item.price)));
    const add = el('button', 'btn btn-outline-danger w-100', item.available ? 'Добавить в корзину' : 'Нет в наличии');
    $(add).attr("type", 'button');
    $(add).attr("data-add-food", item.id);
    $(add).prop("disabled", !item.available);
    $(add).attr('aria-label', `${item.available ? 'Добавить в корзину' : 'Недоступно'}: ${item.name}`);
    $(body).append(add);
    $(article).append(photo, body);
    $(column).append(article);
    return column;
  }
  function renderMenu() {
    const matches = window.TopGameLogic.filterMenu(menu, $(search).val(), $(category).val(), $(available).prop("checked"));
    if ($(sort).val() === 'price-asc') matches.sort((a, b) => a.price - b.price);else if ($(sort).val() === 'price-desc') matches.sort((a, b) => b.price - a.price);else if ($(sort).val() === 'name') matches.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    $(count).text(`Найдено: ${matches.length} из ${menu.length}.`);
    renderList(menuCards, matches, renderProduct, 'Ничего не найдено. Измените запрос или сбросьте фильтры.');
  }
  function renderCartLine(line) {
    const item = menu.find(product => product.id === line.id);
    const article = el('article', 'bg-white border rounded-3 p-3');
    $(article).append(el('h4', 'h6 fw-bold mb-2', item.name), el('p', 'small mb-2', `${money(item.price)} × ${line.quantity} = ${money(item.price * line.quantity)}`));
    const actions = el('div', 'd-flex flex-wrap align-items-center gap-2');
    [['decrease', '−', `Уменьшить количество: ${item.name}`], ['increase', '+', `Увеличить количество: ${item.name}`], ['remove', 'Удалить', `Удалить: ${item.name}`]].forEach(([action, text, label]) => {
      const button = el('button', action === 'remove' ? 'btn btn-outline-secondary' : 'btn btn-outline-secondary btn-lg', text);
      $(button).attr("type", 'button');
      $(button).attr("data-cart-action", action);
      $(button).attr("data-item-id", item.id);
      $(button).attr('aria-label', label);
      if (action === 'increase') $(button).prop("disabled", line.quantity >= maxQuantity);
      $(actions).append(button);
    });
    $(el('span', 'small fw-semibold', `${line.quantity} шт.`)).insertBefore($(actions).children().toArray()[1]);
    $(article).append(actions);
    return article;
  }
  function renderCart() {
    const totals = cartTotals(cart);
    renderList(cartRows, cart, renderCartLine, 'Корзина пустая. Добавьте еду или напиток из меню.');
    $(cartTotal).text(`Товаров: ${totals.quantity} · Итого: ${money(totals.total)}`);
    document.dispatchEvent(new CustomEvent('booking:food-cost', { detail: totals.total }));
    $(clear).prop("disabled", cart.length === 0);
    updateBadge();
  }
  function saveCart(message) {
    const saved = store.set('cart', cart);
    renderCart();
    notify(feedback, saved ? message : `${message} Сохранение недоступно; корзина работает до закрытия страницы.`, '');
  }
  $(menuCards).on('click', event => {
    const button = $(event.target).closest('[data-add-food]').get(0);
    if (!button) return;
    const item = menu.find(product => product.id === $(button).attr("data-add-food") && product.available);
    if (!item) return;
    const line = cart.find(entry => entry.id === item.id);
    if (line && line.quantity >= maxQuantity) {
      notify(feedback, `В корзине уже ${maxQuantity} шт. «${item.name}».`, 'error');
      return;
    }
    if (line) line.quantity += 1;else cart.push({
      id: item.id,
      quantity: 1
    });
    saveCart(`Добавлено: ${item.name}. В корзине ${cartTotals(cart).quantity} шт.`);
    renderMenu();
    $(count).text($(count).text() + ` Добавлено: ${item.name}. В корзине ${cartTotals(cart).quantity} шт.`);
    $(menuCards).find(`[data-add-food="${item.id}"]`).first().trigger("focus");
  });
  $(cartRows).on('click', event => {
    const button = $(event.target).closest('[data-cart-action]').get(0);
    if (!button) return;
    const line = cart.find(entry => entry.id === $(button).attr("data-item-id"));
    if (!line) return;
    const action = $(button).attr("data-cart-action");
    if (action === 'increase' && line.quantity < maxQuantity) line.quantity += 1;else if (action === 'decrease') line.quantity -= 1;else if (action === 'remove') line.quantity = 0;
    cart = cart.filter(entry => entry.quantity > 0);
    saveCart('Корзина обновлена.');
    const replacement = $(cartRows).find(`[data-item-id="${$(button).attr("data-item-id")}"][data-cart-action="${action}"]`).get(0);
    if (replacement && !$(replacement).prop("disabled")) $(replacement).trigger("focus");else if (!$(clear).prop("disabled")) $(clear).trigger("focus");else $('#food-cart-close').trigger("focus");
  });
  $(clear).on('click', () => {
    cart = [];
    saveCart('Корзина очищена.');
    $('#food-cart-close').trigger('focus');
  });
  $(search).on('input', renderMenu);
  [category, sort, available].forEach(field => $(field).on('change', renderMenu));
  $(reset).on('click', () => {
    $(search).val('');
    $(category).val('all');
    $(sort).val('default');
    $(available).prop("checked", false);
    renderMenu();
    $(count).text($(count).text() + ' Фильтры сброшены.');
    $(search).trigger("focus");
  });
  $(window).on('storage', event => {
    if (event.key === 'topgame-cart' || event.key === null) {
      cart = readCart();
      renderCart();
      notify(feedback, 'Корзина обновлена в другой вкладке.', '');
    }
  });
  renderMenu();
  renderCart();
});

