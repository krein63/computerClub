// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const {
    el,
    money,
    menu,
    store,
    renderList,
    notify,
    tariffs,
    reservationAmount
  } = window.TopGame;
  const categoryNames = {
    food: 'Еда',
    snacks: 'Снеки',
    drinks: 'Напитки'
  };
  const maxQuantity = 20;
  let cart = readCart();
  const cartButton = el('button', 'nav-link px-2 w-100 text-start');
  $(cartButton).attr({
    id: 'nav-cart',
    type: 'button',
    'data-food-cart-open': '',
    'aria-haspopup': 'dialog',
    'aria-controls': 'food-cart-dialog'
  });
  const navItem = el('li', 'nav-item');
  $(navItem).append(cartButton).appendTo('#main-navigation .navbar-nav');

  const menuContainer = document.getElementById('food-menu');
  const cartDialog = el('dialog', 'booking-panel food-cart-dialog');
  $(cartDialog).attr({ id: 'food-cart-dialog', 'aria-labelledby': 'food-cart-dialog-title' });
  const cartHeader = el('div', 'food-cart-header d-flex justify-content-between align-items-center gap-3 mb-3');
  const cartTitle = el('h2', 'booking-heading mb-0', 'Корзина');
  $(cartTitle).attr('id', 'food-cart-dialog-title');
  const closeCart = el('button', 'btn btn-outline-secondary btn-sm flex-shrink-0', 'Закрыть');
  $(closeCart).attr({ id: 'food-cart-close', type: 'button', autofocus: '' });
  $(cartHeader).append(cartTitle, closeCart);
  const resultContainer = el('div', 'food-cart-body');
  $(resultContainer).attr('id', 'food-cart');
  $(cartDialog).append(cartHeader, resultContainer).appendTo(document.body);

  let cartTrigger;
  $(document).on('click', '[data-food-cart-open]', function () {
    if (cartDialog.open) return;
    cartTrigger = this;
    cartDialog.showModal();
  });
  $(closeCart).on('click', () => cartDialog.close());
  cartDialog.addEventListener('close', () => {
    if (cartDialog.open) return;
    if (isCartLink()) {
      const activeTab = document.querySelector('.booking-tabs [aria-selected="true"]');
      const hash = activeTab ? '#' + activeTab.getAttribute('aria-controls') : '';
      history.replaceState(history.state, '', location.href.split('#')[0] + hash);
    }
    (cartTrigger ?? cartButton).focus({ preventScroll: true });
    cartTrigger = null;
  });

  function isCartLink() {
    return location.hash === '#food-cart' || location.hash === '#food-cart-dialog';
  }

  // Keep saved links to the old cart working.
  function syncLinkedCart() {
    if (isCartLink()) cartButton.click();
    else if (cartDialog.open) cartDialog.close();
  }
  window.addEventListener('hashchange', syncLinkedCart);
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
    $(cartButton).text(`Корзина · ${cartTotals(cart).quantity}`);
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
  if (menuContainer) {
    const visit = el('section', 'border-bottom pb-3 mb-3');
    const details = el('p', 'small mb-1');
    const price = el('p', 'fw-semibold mb-0');
    visit.append(el('h3', 'h6 mb-2', 'Последняя заявка на ПК'), details, price);
    visit.hidden = true;
    resultContainer.prepend(visit);
    document.addEventListener('booking:latest', event => {
      const booking = event.detail;
      visit.hidden = !booking;
      if (!booking) return;
      const amount = reservationAmount(tariffs, booking);
      details.textContent = `${booking.date}, ${booking.time} · ${booking.duration} ч. · ПК ${booking.seats.join(', ')}`;
      price.textContent = amount === null ? '' : money(amount);
    });
  }
  const orderNote = el('aside', 'alert alert-light border mb-3');
  $(orderNote).attr('aria-labelledby', 'food-order-note-title');
  const orderNoteTitle = el('h3', 'h6 fw-bold mb-2', 'Получение заказа');
  $(orderNoteTitle).attr('id', 'food-order-note-title');
  $(orderNote).append(orderNoteTitle, el('p', 'mb-0', 'Назовите позиции администратору у стойки и оплатите заказ в клубе.'));
  $(cartSection).append(orderNote);
  if (!menuContainer) {
    const menuLink = el('a', 'btn btn-outline-secondary', 'Посмотреть меню');
    $(menuLink).attr('href', 'booking.html#food-menu');
    $(cartSection).append(menuLink);
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
    renderList(cartRows, cart, renderCartLine, 'Еда и напитки пока не добавлены.');
    $(cartTotal).text(`Еда и напитки · ${totals.quantity} шт. · ${money(totals.total)}`);
    document.dispatchEvent(new CustomEvent('booking:food-cost', { detail: totals.total }));
    $(clear).prop("disabled", cart.length === 0);
    updateBadge();
    if (menuContainer) updateMenuQuantities();
  }
  function saveCart(message) {
    const saved = store.set('cart', cart);
    renderCart();
    notify(feedback, saved ? message : `${message} Сохранение недоступно; корзина работает до закрытия страницы.`, '');
  }
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
    if (replacement && !replacement.disabled) replacement.focus({ preventScroll: true });
    else if (!clear.disabled) clear.focus({ preventScroll: true });
    else closeCart.focus({ preventScroll: true });
  });
  $(clear).on('click', () => {
    cart = [];
    saveCart('Корзина очищена.');
    closeCart.focus({ preventScroll: true });
  });
  function initFoodMenu() {
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
    const goCart = el('button', 'btn btn-outline-danger btn-sm', 'Открыть корзину');
    $(goCart).attr({
      type: 'button',
      'data-food-cart-open': '',
      'aria-haspopup': 'dialog',
      'aria-controls': 'food-cart-dialog'
    });
    $(optionsRow).append(availabilityRow, reset, goCart);
    const count = el('p', 'small text-body-secondary mb-3');
    $(count).attr("id", 'food-count');
    $(count).attr('role', 'status');
    const menuFeedback = el('p', 'visually-hidden');
    menuFeedback.setAttribute('role', 'status');
    const menuCards = el('div', 'row g-3');
    $(menuCards).attr("id", 'food-cards');
    $(menuSection).append(controls, optionsRow, count, menuFeedback, menuCards);
    $(menuContainer).append(menuSection);
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
      const quantityStatus = el('p', 'small text-body-secondary mb-2');
      quantityStatus.id = `food-quantity-${item.id}`;
      const add = el('button', 'btn btn-outline-danger w-100');
      $(add).attr("type", 'button');
      $(add).attr("data-add-food", item.id);
      $(add).prop("disabled", !item.available);
      add.setAttribute('aria-describedby', quantityStatus.id);
      $(body).append(quantityStatus, add);
      $(article).append(photo, body);
      $(column).append(article);
      return column;
    }
    function renderMenu() {
      const matches = window.TopGameLogic.filterMenu(menu, $(search).val(), $(category).val(), $(available).prop("checked"));
      if ($(sort).val() === 'price-asc') matches.sort((a, b) => a.price - b.price);else if ($(sort).val() === 'price-desc') matches.sort((a, b) => b.price - a.price);else if ($(sort).val() === 'name') matches.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      $(count).text(`Найдено: ${matches.length} из ${menu.length}.`);
      renderList(menuCards, matches, renderProduct, 'Ничего не найдено. Измените запрос или сбросьте фильтры.');
      updateMenuQuantities();
    }
    $(menuCards).on('click', event => {
      const button = $(event.target).closest('[data-add-food]').get(0);
      if (!button) return;
      const item = menu.find(product => product.id === $(button).attr("data-add-food") && product.available);
      if (!item) return;
      const line = cart.find(entry => entry.id === item.id);
      if (line && line.quantity >= maxQuantity) {
        menuFeedback.textContent = `Достигнут лимит: ${maxQuantity} шт. «${item.name}» в одной корзине.`;
        return;
      }
      const quantity = (line?.quantity ?? 0) + 1;
      if (line) line.quantity = quantity;
      else cart.push({ id: item.id, quantity });
      const message = `${item.name} · в корзине ${quantity} из ${maxQuantity} шт.`;
      saveCart(message);
      menuFeedback.textContent = message;
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
    renderMenu();
  }
  function updateMenuQuantities() {
    for (const button of menuContainer.querySelectorAll('[data-add-food]')) {
      const item = menu.find(product => product.id === button.dataset.addFood);
      const quantity = cart.find(line => line.id === item.id)?.quantity ?? 0;
      const atLimit = quantity >= maxQuantity;
      const label = !item.available ? 'Нет в наличии' : atLimit ? 'Достигнут лимит' : 'Добавить в корзину';
      menuContainer.querySelector(`#food-quantity-${item.id}`).textContent = item.available
        ? `В корзине ${quantity} из ${maxQuantity} шт.`
        : 'Позиция недоступна';
      button.textContent = label;
      button.setAttribute('aria-label', `${label}: ${item.name}`);
      button.setAttribute('aria-disabled', String(atLimit || !item.available));
      button.classList.toggle('opacity-50', atLimit);
    }
  }
  window.addEventListener('storage', event => {
    if (event.key === 'topgame-cart' || event.key === null) {
      cart = readCart();
      renderCart();
      notify(feedback, 'Корзина обновлена в другой вкладке.', '');
    }
  });
  renderCart();
  if (menuContainer) initFoodMenu();
  syncLinkedCart();
});

