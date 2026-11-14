// jQuery 3.7.1 full build is loaded first; ready waits until the page exists.
'use strict';

$(function () {
  const app = window.TopGame;
  const list = $('#game-cards').get(0);
  if (!app || !list) return;

  // The delegated effect still applies after search or favourite filtering rebuilds the cards.
  $('#game-cards')
    .on('mouseenter', '[data-game]', function () {
      $(this).removeClass('btn-outline-danger').addClass('btn-success');
    })
    .on('mouseleave', '[data-game]', function () {
      $(this).removeClass('btn-success').addClass('btn-outline-danger');
    });

  const games = [
    { id: 'cs2', title: 'Counter-Strike 2', genre: 'shooter', format: 'Командный шутер, 5 × 5', source: true, official: 'https://www.counter-strike.net/cs2', image: 'images/games/cs2.jpg' },
    { id: 'dota2', title: 'Dota 2', genre: 'moba', format: 'MOBA, две команды по пять игроков', source: true, official: 'https://www.dota2.com/', image: 'images/games/dota2.jpg' },
    { id: 'valorant', title: 'VALORANT', genre: 'shooter', format: 'Тактический шутер, 5 × 5', source: false, official: 'https://playvalorant.com/', image: 'images/games/valorant.jpg' },
    { id: 'lol', title: 'League of Legends', genre: 'moba', format: 'Командная MOBA', source: false, official: 'https://www.leagueoflegends.com/', image: 'images/games/lol.jpg' },
    { id: 'rocket-league', title: 'Rocket League', genre: 'sports', format: 'Футбол на автомобилях', source: false, official: 'https://www.rocketleague.com/', image: 'images/games/rocket-league.jpg' },
    { id: 'civilization', title: 'Sid Meier’s Civilization VI', genre: 'strategy', format: 'Пошаговая стратегия', source: false, official: 'https://civilization.2k.com/civ-vi/', image: 'images/games/civilization.jpg' }
  ];
  const genreNames = { shooter: 'Шутер', moba: 'MOBA', strategy: 'Стратегия', sports: 'Спорт' };
  const savedFavorites = app.store.get('favorite-games', []);
  let favorites = Array.isArray(savedFavorites) ? games.filter(game => savedFavorites.includes(game.id)).map(game => game.id) : [];
  const controls = app.el('div', 'row g-3 mb-4');
  $(controls).attr({ role: 'search', 'aria-label': 'Поиск и фильтры игр' });

  function addControl(id, labelText, kind, options, classes = 'col-12 col-md-6 col-lg-3') {
    const wrapper = app.el('div', classes);
    const label = app.el('label', 'form-label fw-semibold', labelText);
    $(label).attr('for', id);
    const field = app.el(kind, kind === 'select' ? 'form-select' : 'form-control');
    $(field).attr('id', id);
    if (kind === 'input') $(field).attr('type', 'search');
    if (options) options.forEach(([value, text]) => {
      const option = app.el('option', '', text);
      $(option).val(value);
      $(field).append(option);
    });
    $(wrapper).append(label, field);
    $(controls).append(wrapper);
    return field;
  }

  const search = addControl('games-search', 'Название игры', 'input');
  const category = addControl('games-category', 'Жанр', 'select', [['all', 'Все жанры'], ...Object.entries(genreNames)]);
  const availability = addControl('games-availability', 'Каталог', 'select', [['all', 'Все игры'], ['source', 'Упомянуты на сайте'], ['suggestion', 'Предложения для клуба']]);
  const sort = addControl('games-sort', 'Сортировать', 'select', [['name', 'По названию А–Я'], ['genre', 'По жанру']]);
  const favoriteFilter = addControl('games-favorites', 'Избранное', 'select', [['all', 'Все игры'], ['favorites', 'Только избранные']]);
  const actions = app.el('div', 'col-12 d-flex flex-wrap align-items-center gap-3');
  const reset = app.el('button', 'btn btn-outline-secondary', 'Сбросить фильтры');
  $(reset).attr({ type: 'button', id: 'games-filter-reset' });
  const count = app.el('p', 'mb-0');
  $(count).attr({ id: 'games-result-count', 'aria-live': 'polite' });
  $(actions).append(reset, count);
  $(controls).append(actions);
  const favoriteNotice = app.el('div', 'favorite-notice d-flex align-items-center justify-content-between gap-2 p-3 rounded-3');
  const favoriteStatus = app.el('p', 'mb-0');
  favoriteStatus.id = 'games-favorite-status';
  favoriteStatus.setAttribute('role', 'status');
  const dismissFavoriteNotice = app.el('button', 'btn favorite-notice-close flex-shrink-0', '×');
  dismissFavoriteNotice.type = 'button';
  dismissFavoriteNotice.setAttribute('aria-label', 'Закрыть уведомление');
  favoriteNotice.append(favoriteStatus, dismissFavoriteNotice);
  $(list).before(controls);
  document.body.append(favoriteNotice);
  let favoriteNoticeTrigger;
  dismissFavoriteNotice.addEventListener('click', () => {
    if (favoriteNotice.contains(document.activeElement)) {
      (favoriteNoticeTrigger?.isConnected ? favoriteNoticeTrigger : favoriteFilter).focus({ preventScroll: true });
    }
    favoriteNotice.classList.remove('is-visible');
  });
  $(list).closest('section').first().find('header .lead').first().text('Выберите игру, сохраните её в избранное и запланируйте визит с друзьями. Наличие версии уточняйте у администратора.');

  const svgNamespace = 'http://www.w3.org/2000/svg';
  const favoritePath = document.createElementNS(svgNamespace, 'path');
  $(favoritePath).attr('d', 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const heartAnimations = new WeakMap();

  function setFavoriteButton(button, game, selected) {
    const label = selected ? 'Убрать из избранного' : 'Добавить в избранное';
    button.classList.toggle('is-favorite', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.setAttribute('aria-label', `${label}: ${game.title}`);
    button.title = label;
  }

  function animateFavorite(button, adding) {
    const icon = button.querySelector('svg');
    heartAnimations.get(button)?.cancel();
    button.querySelector('.favorite-burst')?.remove();
    if (reducedMotion.matches || !icon.animate) return;
    heartAnimations.set(button, icon.animate(
      [{ scale: 0.86 }, { scale: adding ? 1.24 : 1.07, offset: 0.44 }, { scale: 1 }],
      { duration: 360, easing: 'ease-out' }
    ));
    if (!adding) return;

    const burst = app.el('span', 'favorite-burst');
    burst.setAttribute('aria-hidden', 'true');
    for (let particle = 0; particle < 8; particle += 1) {
      const spark = app.el('span', 'favorite-spark');
      spark.style.setProperty('--spark-angle', `${particle * 45}deg`);
      burst.append(spark);
    }
    burst.addEventListener('animationend', () => burst.remove(), { once: true });
    button.append(burst);
  }

  function renderGame(game) {
    const column = app.el('div', 'col-12 col-md-6 col-lg-4');
    const card = app.el('article', 'card h-100 shadow-sm overflow-hidden position-relative');
    $(card).attr('id', `game-${game.id}`);
    const cover = app.el('div', 'ratio ratio-16x9 position-relative');
    const image = app.el('img', 'w-100 h-100 object-fit-cover');
    $(image).attr({ src: game.image, alt: `Обложка игры ${game.title}` });
    image.loading = 'lazy';
    image.decoding = 'async';
    const favorite = app.el('button', 'favorite-heart');
    $(favorite).attr({ type: 'button', 'data-favorite-game': game.id });
    setFavoriteButton(favorite, game, favorites.includes(game.id));
    const icon = document.createElementNS(svgNamespace, 'svg');
    $(icon).attr({ viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });
    $(icon).append(favoritePath.cloneNode());
    $(favorite).append(icon);
    $(cover).append(image);
    const body = app.el('div', 'card-body p-3 p-lg-4 d-flex flex-column');
    const official = app.el('a', 'mb-3', 'Официальный сайт игры');
    $(official).attr({ href: game.official, target: '_blank', rel: 'noopener noreferrer' });
    const book = app.el('a', 'btn btn-outline-danger mt-auto', 'Забронировать место');
    $(book).attr({ href: 'booking.html#booking-form', 'data-game': game.id, 'aria-label': `Забронировать место для игры в ${game.title}` });
    $(body).append(app.el('h2', 'h4 fw-bold mb-2', game.title), app.el('p', 'small text-danger fw-semibold', genreNames[game.genre]), app.el('p', 'card-text', game.format), official, book);
    $(card).append(cover, favorite, body);
    $(column).append(card);
    return column;
  }

  function renderGames() {
    const query = $(search).val().trim().toLocaleLowerCase('ru');
    const matches = games.filter(game => game.title.toLocaleLowerCase('ru').includes(query) && ($(category).val() === 'all' || game.genre === $(category).val()) && ($(availability).val() === 'all' || game.source === ($(availability).val() === 'source')) && ($(favoriteFilter).val() !== 'favorites' || favorites.includes(game.id)));
    matches.sort((first, second) => $(sort).val() === 'genre' ? genreNames[first.genre].localeCompare(genreNames[second.genre], 'ru') || first.title.localeCompare(second.title, 'ru') : first.title.localeCompare(second.title, 'ru'));
    app.renderList(list, matches, renderGame, 'Подходящих игр нет. Измените поиск или сбросьте фильтры.');
    $(count).text(`Найдено игр: ${matches.length} из ${games.length}`);
  }

  $(list).on('click', '[data-favorite-game]', function () {
    const id = $(this).attr('data-favorite-game');
    const game = games.find(item => item.id === id);
    if (!game) return;
    const adding = !favorites.includes(id);
    favorites = adding ? [...favorites, id] : favorites.filter(value => value !== id);
    const saved = app.store.set('favorite-games', favorites);
    const buttonHadFocus = document.activeElement === this;
    favoriteNoticeTrigger = this;
    if ($(favoriteFilter).val() === 'favorites' && !adding) {
      const column = this.closest('article').parentElement;
      const neighbor = column.nextElementSibling || column.previousElementSibling;
      favoriteNoticeTrigger = neighbor?.querySelector('[data-favorite-game]') ?? favoriteFilter;
      column.remove();
      if (list.childElementCount === 0) renderGames();
      else $(count).text(`Найдено игр: ${list.childElementCount} из ${games.length}`);
      if (buttonHadFocus) favoriteNoticeTrigger.focus({ preventScroll: true });
    } else {
      setFavoriteButton(this, game, adding);
      animateFavorite(this, adding);
    }
    favoriteNotice.classList.toggle('success', saved);
    favoriteNotice.classList.toggle('error', !saved);
    favoriteNotice.classList.add('is-visible');
    favoriteStatus.textContent = `${game.title}: ${adding ? 'добавлена в избранное' : 'удалена из избранного'}.${saved ? '' : ' Сохранение недоступно, список действует до перезагрузки.'}`;
  });
  $(controls).on('input', 'input', renderGames);
  $(controls).on('change', 'select', renderGames);
  $(reset).on('click', () => {
    $(search).val('');
    $(category).val('all');
    $(availability).val('all');
    $(sort).val('name');
    $(favoriteFilter).val('all');
    renderGames();
    $(search).trigger('focus');
  });
  renderGames();
});
