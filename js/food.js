// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const {
    el,
    money,
    menu,
    seats,
    store,
    renderList,
    setError,
    clearErrors,
    validateContacts,
    notify,
    reference
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
  $(cartLink).attr("href", 'booking.html#food-cart');
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
  const resultContainer = $('#booking-result').get(0);
  if (!resultContainer) {
    $(window).on('storage', event => {
      if (event.key === 'topgame-cart') {
        cart = readCart();
        updateBadge();
      }
    });
    return;
  }
  const cartSection = el('section', 'border-top pt-4 mt-4');
  $(cartSection).attr("id", 'food-cart');
  $(cartSection).attr('aria-labelledby', 'food-cart-title');
  const cartTitle = el('h3', 'h3 fw-bold mb-3', 'Твой заказ еды');
  $(cartTitle).attr("id", 'food-cart-title');
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
  const orderSuccess = el('div', 'alert hidden mt-3 text-break');
  $(orderSuccess).attr("id", 'food-order-success');
  $(orderSuccess).attr('role', 'status');
  $(orderSuccess).attr('aria-live', 'polite');
  $(cartSection).append(cartTitle, el('p', 'small text-body-secondary', 'Учебные заказы сохраняются только в этом браузере. Данные не отправляются в клуб; реальный заказ и платёж не создаются.'), cartRows, cartTotal, clear, feedback);
  $(resultContainer).append(cartSection);
  const orderForm = el('form', 'border rounded-3 p-3');
  $(orderForm).attr("id", 'food-order-form');
  $(orderForm).prop("noValidate", true);
  $(orderForm).append(el('h4', 'h4 mb-3', 'Получение заказа'));
  const fields = el('div', 'row g-3');
  function inputField(id, labelText, type, autocomplete) {
    const column = el('div', 'col-12 col-md-6');
    const label = el('label', 'form-label fw-semibold', labelText);
    $(label).attr("for", id);
    const field = el('input', 'form-control');
    $(field).attr("id", id);
    $(field).attr("type", type);
    $(field).attr("name", id);
    $(field).prop("required", true);
    $(field).attr("autocomplete", autocomplete);
    $(field).attr("maxlength", type === 'email' ? 254 : type === 'tel' ? 30 : 80);
    $(column).append(label, field);
    $(fields).append(column);
    return field;
  }
  const name = inputField('food-name', 'Имя', 'text', 'name');
  const email = inputField('food-email', 'Электронная почта', 'email', 'email');
  const phone = inputField('food-phone', 'Телефон (+7 и 10 цифр)', 'tel', 'tel');
  const deliveryColumn = el('div', 'col-12 col-md-6');
  const deliveryLabel = el('label', 'form-label fw-semibold', 'Способ получения');
  $(deliveryLabel).attr("for", 'food-delivery');
  const delivery = el('select', 'form-select');
  $(delivery).attr("id", 'food-delivery');
  $(delivery).prop("required", true);
  [['', 'Выберите способ'], ['bar', 'Заберу у стойки'], ['seat', 'К игровому месту']].forEach(([value, text]) => {
    const option = el('option', '', text);
    $(option).val(value);
    $(delivery).append(option);
  });
  $(deliveryColumn).append(deliveryLabel, delivery);
  $(fields).append(deliveryColumn);
  const seatColumn = el('div', 'col-12 col-md-6 hidden');
  const seatLabel = el('label', 'form-label fw-semibold', 'Номер ПК');
  $(seatLabel).attr("for", 'food-seat');
  const seat = el('select', 'form-select');
  $(seat).attr("id", 'food-seat');
  const noSeat = el('option', '', 'Выберите ПК');
  $(noSeat).val('');
  $(seat).append(noSeat);
  seats.forEach(item => {
    const option = el('option', '', `ПК ${String(item.id).padStart(2, '0')} · ${item.zone.toUpperCase()}`);
    $(option).val(item.id);
    $(seat).append(option);
  });
  $(seatColumn).append(seatLabel, seat);
  $(fields).append(seatColumn);
  const agreementRow = el('div', 'form-check my-3');
  const agreement = el('input', 'form-check-input');
  $(agreement).attr("id", 'food-agreement');
  $(agreement).attr("type", 'checkbox');
  $(agreement).prop("required", true);
  const agreementLabel = el('label', 'form-check-label', 'Проверил состав и подтверждаю заказ');
  $(agreementLabel).attr("for", agreement.id);
  $(agreementRow).append(agreement, agreementLabel);
  const checkout = el('button', 'btn btn-danger', 'Отправить заказ');
  $(checkout).attr("id", 'food-checkout');
  $(checkout).attr("type", 'submit');
  const formStatus = el('p', 'small mt-3 mb-0');
  $(formStatus).attr("id", 'food-order-status');
  $(formStatus).attr('aria-live', 'polite');
  $(orderForm).append(fields, agreementRow, checkout, formStatus);
  $(cartSection).append(orderForm, orderSuccess);
  const menuSection = el('section', 'bg-white border rounded-4 p-3 p-md-4 p-lg-5 mb-4 shadow-sm');
  $(menuSection).attr("id", 'food-menu');
  $(menuSection).attr('aria-labelledby', 'food-menu-title');
  const menuTitle = el('h2', 'h2 fw-bold mb-3', 'Перекус без паузы в игре');
  $(menuTitle).attr("id", 'food-menu-title');
  $(menuSection).append(el('p', 'small text-uppercase text-danger fw-semibold mb-2', 'Еда и напитки'), menuTitle, el('p', 'mb-4', 'Соберите корзину, выберите получение у стойки или номер ПК и проверьте итог. Получение у стойки или к выбранному игровому месту.'));
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
  const goCart = el('a', 'btn btn-outline-danger btn-sm', 'Перейти к корзине');
  $(goCart).attr("href", '#food-cart');
  $(optionsRow).append(availabilityRow, reset, goCart);
  const count = el('p', 'small text-body-secondary mb-3');
  $(count).attr("id", 'food-count');
  $(count).attr('role', 'status');
  const menuCards = el('div', 'row g-3');
  $(menuCards).attr("id", 'food-cards');
  $(menuSection).append(controls, optionsRow, count, menuCards);
  $(menuSection).insertBefore($('#direct-contact').get(0));
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
    $(clear).prop("disabled", cart.length === 0);
    $(checkout).prop("disabled", cart.length === 0);
    updateBadge();
    updateOrderSummary();
  }
  function updateOrderSummary() {
    const location = $(delivery).val() === 'seat' ? $(seat).val() ? `к ПК ${$(seat).val()}` : 'выберите ПК' : $(delivery).val() === 'bar' ? 'у стойки' : 'выберите получение';
    $(formStatus).text(`${cartTotals(cart).quantity} шт., ${money(cartTotals(cart).total)} · ${location}. Максимум ${maxQuantity} шт. каждого товара.`);
  }
  function saveCart(message) {
    const saved = store.set('cart', cart);
    renderCart();
    notify(feedback, saved ? message : `${message} Сохранение недоступно; корзина работает до закрытия страницы.`, '');
    notify(orderSuccess, '', '');
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
    if (replacement && !$(replacement).prop("disabled")) $(replacement).trigger("focus");else if (!$(clear).prop("disabled")) $(clear).trigger("focus");else $(search).trigger("focus");
  });
  $(clear).on('click', () => {
    cart = [];
    clearErrors(orderForm);
    saveCart('Корзина очищена.');
    $(search).trigger("focus");
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
  $(delivery).on('change', () => {
    const toSeat = $(delivery).val() === 'seat';
    $(seatColumn).toggleClass('hidden', !toSeat);
    $(seat).prop("disabled", !toSeat);
    $(seat).prop("required", toSeat);
    if (!toSeat) {
      $(seat).val('');
      setError(seat, '');
    }
  });
  $(orderForm).on('input', event => {
    if (event.target.id) setError(event.target, '');
    notify(orderSuccess, '', '');
    updateOrderSummary();
  });
  $(orderForm).on('change', event => {
    if (event.target.id) setError(event.target, '');
    notify(orderSuccess, '', '');
    updateOrderSummary();
  });
  $(orderForm).on('submit', event => {
    event.preventDefault();
    clearErrors(orderForm);
    if (cart.length === 0) {
      notify(feedback, 'Добавьте хотя бы один товар.', 'error');
      return;
    }
    const contacts = validateContacts($(name).val(), $(email).val(), $(phone).val());
    const errors = [[name, contacts.name], [email, contacts.email], [phone, contacts.phone], [delivery, ['bar', 'seat'].includes($(delivery).val()) ? '' : 'Выберите способ получения.'], [seat, $(delivery).val() === 'seat' && !seats.some(item => String(item.id) === $(seat).val()) ? 'Для доставки к месту выберите действующий номер ПК.' : ''], [agreement, $(agreement).prop("checked") ? '' : 'Подтвердите, что проверили состав заказа.']];
    const invalid = errors.filter(([field, message]) => setError(field, message));
    if (invalid.length > 0) {
      notify(feedback, `Исправьте поля: ${invalid.length}.`, 'error');
      $(invalid[0][0]).trigger("focus");
      return;
    }
    const totals = cartTotals(cart);
    const items = cart.map(line => `${menu.find(item => item.id === line.id).name} × ${line.quantity}`).join('; ');
    const destination = $(delivery).val() === 'seat' ? `к ПК ${$(seat).val()}` : 'у стойки';
    const orderRef = reference('FOOD');
    const summary = `${orderRef}. ${$(name).val().trim()}, получение ${destination}. ${items}. Всего ${totals.quantity} шт., ${money(totals.total)}. Контакты: ${$(email).val().trim()}, ${$(phone).val().trim()}. Заказ сохранён в этом браузере. Данные не отправлены в клуб; реальный заказ и платёж не созданы.`;
    const orders = store.get('orders', []);
    const saved = store.set('orders', [...(Array.isArray(orders) ? orders : []), {
      id: orderRef,
      items: cart,
      total: totals.total,
      destination,
      createdAt: new Date().toISOString()
    }]);
    cart = [];
    store.set('cart', cart);
    renderCart();
    $(orderForm).trigger("reset");
    $(seatColumn).addClass("hidden");
    $(seat).prop("disabled", true);
    $(seat).prop("required", false);
    updateOrderSummary();
    notify(feedback, 'Заказ оформлен. Корзина очищена.', 'success');
    notify(orderSuccess, saved ? summary : summary.replace('Заказ сохранён в этом браузере.', 'Заказ сформирован на странице; браузер не разрешил сохранение.'), 'success');
    $(orderSuccess).prop("tabIndex", -1);
    $(orderSuccess).trigger("focus");
  });
  $(window).on('storage', event => {
    if (event.key === 'topgame-cart') {
      cart = readCart();
      renderCart();
      notify(feedback, 'Корзина обновлена в другой вкладке.', '');
      notify(orderSuccess, '', '');
    }
  });
  $(seat).prop("disabled", true);
  renderMenu();
  renderCart();
});

